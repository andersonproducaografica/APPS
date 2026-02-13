const form = document.querySelector('#booking-form');
const resultContainer = document.querySelector('#result');
const dateInput = document.querySelector('#date');
const timeInput = document.querySelector('#time');
const originStreetInput = document.querySelector('#originStreet');
const destinationStreetInput = document.querySelector('#destinationStreet');
const originStreetSuggestions = document.querySelector('#originStreetSuggestions');
const destinationStreetSuggestions = document.querySelector('#destinationStreetSuggestions');

const PRICE_PER_KM = 3.5;
const MIN_FARE = 35;
const ROUND_TRIP_SURCHARGE = 20;

function parsePetCount(text) {
  const numbers = text.match(/\d+/g);
  if (!numbers) return 1;
  return numbers.map(Number).reduce((acc, n) => acc + n, 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function toLocalDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toTimeInputValue(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function normalizeZip(zip) {
  return zip.replace(/\D/g, '');
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function lookupZipInfo(zip) {
  const cleanZip = normalizeZip(zip);
  if (cleanZip.length !== 8) return null;
  const data = await fetchJson(`https://viacep.com.br/ws/${cleanZip}/json/`);
  if (!data || data.erro) return null;
  return {
    street: data.logradouro || '',
    neighborhood: data.bairro || '',
    city: data.localidade || '',
    state: data.uf || ''
  };
}

function buildAddressQueries(street, number, zip, zipInfo) {
  const cleanZip = normalizeZip(zip);
  const cityState = zipInfo?.city && zipInfo?.state ? `${zipInfo.city} ${zipInfo.state}` : '';
  const neighborhood = zipInfo?.neighborhood || '';

  return [
    `${street}, ${number}, ${cleanZip}, Brasil`,
    `${street}, ${number}, ${neighborhood}, ${cityState}, Brasil`,
    `${street}, ${number}, ${cityState}, Brasil`,
    `${street}, ${number}, Brasil`,
    `${street}, ${cleanZip}, Brasil`,
    `${street}, ${cityState}, Brasil`,
    `${street}, Brasil`
  ].filter(Boolean);
}

async function geocodeByNominatim(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'br');
  url.searchParams.set('addressdetails', '1');

  const data = await fetchJson(url.toString());
  if (!data || !data.length) return null;

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon)
  };
}

async function geocodeByPhoton(query) {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '1');
  url.searchParams.set('lang', 'pt');

  const data = await fetchJson(url.toString());
  const feature = data?.features?.[0];
  if (!feature?.geometry?.coordinates?.length) return null;

  return {
    lon: Number(feature.geometry.coordinates[0]),
    lat: Number(feature.geometry.coordinates[1])
  };
}


async function fetchAddressSuggestions(query) {
  if (!query || query.trim().length < 3) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', `${query}, Brasil`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');
  url.searchParams.set('countrycodes', 'br');
  url.searchParams.set('addressdetails', '1');

  const data = await fetchJson(url.toString());
  if (!data || !Array.isArray(data)) return [];

  return data
    .map((item) => item.display_name)
    .filter(Boolean)
    .slice(0, 5);
}

function setupAddressAutocomplete(inputEl, datalistEl) {
  let debounceTimer;

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const suggestions = await fetchAddressSuggestions(inputEl.value);
      datalistEl.innerHTML = suggestions.map((text) => `<option value="${text.replace(/"/g, '&quot;')}"></option>`).join('');
    }, 320);
  });

  inputEl.addEventListener('blur', () => {
    clearTimeout(debounceTimer);
  });
}

async function geocodeAddressWithFallback(street, number, zip) {
  const zipInfo = await lookupZipInfo(zip);
  const queries = buildAddressQueries(street, number, zip, zipInfo);

  for (const query of queries) {
    const nominatimResult = await geocodeByNominatim(query);
    if (nominatimResult) return nominatimResult;

    const photonResult = await geocodeByPhoton(query);
    if (photonResult) return photonResult;
  }

  throw new Error(`Não foi possível localizar o endereço: ${street}, ${number}, ${zip}.`);
}

function updateDateAndTimeLimits() {
  const now = new Date();
  const today = toLocalDateInputValue(now);
  dateInput.min = today;

  if (dateInput.value === today) {
    const minTimeDate = new Date(now.getTime() + 30 * 60 * 1000);
    const minTime = toTimeInputValue(minTimeDate);
    timeInput.min = minTime;

    if (timeInput.value && timeInput.value < minTime) {
      timeInput.value = minTime;
    }
  } else {
    timeInput.removeAttribute('min');
  }
}

function validateSchedule(dateValue, timeValue) {
  const now = new Date();
  const schedule = new Date(`${dateValue}T${timeValue}`);

  const today = toLocalDateInputValue(now);
  if (dateValue < today) {
    throw new Error('A data da corrida deve ser hoje ou uma data futura.');
  }

  if (dateValue === today) {
    const minSchedule = new Date(now.getTime() + 30 * 60 * 1000);
    if (schedule < minSchedule) {
      throw new Error('Para hoje, selecione um horário com pelo menos 30 minutos de antecedência.');
    }
  }
}

async function calculateRouteDistanceKm(origin, destination) {
  const originPoint = await geocodeAddressWithFallback(origin.street, origin.number, origin.zip);
  const destinationPoint = await geocodeAddressWithFallback(destination.street, destination.number, destination.zip);

  const routeUrl = new URL(
    `https://router.project-osrm.org/route/v1/driving/${originPoint.lon},${originPoint.lat};${destinationPoint.lon},${destinationPoint.lat}`
  );
  routeUrl.searchParams.set('overview', 'false');
  routeUrl.searchParams.set('alternatives', 'false');

  const routeData = await fetchJson(routeUrl.toString());
  const firstRoute = routeData?.routes?.[0];

  if (!firstRoute?.distance) {
    throw new Error('Não foi possível calcular distância da rota.');
  }

  return firstRoute.distance / 1000;
}

function showResult(content) {
  resultContainer.classList.remove('hidden');
  resultContainer.innerHTML = content;
  resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

setupAddressAutocomplete(originStreetInput, originStreetSuggestions);
setupAddressAutocomplete(destinationStreetInput, destinationStreetSuggestions);

dateInput.addEventListener('change', updateDateAndTimeLimits);
updateDateAndTimeLimits();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const fullName = formData.get('fullName').trim();
  const whatsapp = formData.get('whatsapp').trim();
  const origin = {
    street: formData.get('originStreet').trim(),
    number: formData.get('originNumber').trim(),
    zip: formData.get('originZip').trim()
  };
  const destination = {
    street: formData.get('destinationStreet').trim(),
    number: formData.get('destinationNumber').trim(),
    zip: formData.get('destinationZip').trim()
  };
  const date = formData.get('date');
  const time = formData.get('time');
  const petsDescription = formData.get('pets').trim();
  const roundTrip = formData.get('roundTrip') === 'sim';

  showResult(`
    <h2>Processando solicitação</h2>
    <p>Calculando distância real da rota e cotação...</p>
  `);

  try {
    validateSchedule(date, time);

    const petCount = parsePetCount(petsDescription);
    const oneWayDistanceKm = await calculateRouteDistanceKm(origin, destination);
    const chargedDistanceKm = roundTrip ? oneWayDistanceKm * 2 : oneWayDistanceKm;

    const distanceFare = chargedDistanceKm * PRICE_PER_KM;
    const petSurcharge = petCount > 1 ? (petCount - 1) * 6 : 0;
    const roundTripSurcharge = roundTrip ? ROUND_TRIP_SURCHARGE : 0;
    const estimatedFare = Math.max(MIN_FARE, distanceFare + petSurcharge + roundTripSurcharge);

    const tripLabel = roundTrip ? 'Ida e volta' : 'Só ida';
    const originText = `${origin.street}, ${origin.number} - CEP ${origin.zip}`;
    const destinationText = `${destination.street}, ${destination.number} - CEP ${destination.zip}`;

    const whatsappMessage = [
      '*Olá,*',
      `Me chamo, *${fullName}*.` ,
      'Quero agendar uma corrida!!',
      '',
      `Para: *${date} às ${time}*`,
      `Origem: ${originText}`,
      `Destino: ${destinationText}`,
      `Trecho: ${tripLabel}`,
      `Qtd. de Pets: ${petCount}`,
      `Valor estimado da corrida: *${formatCurrency(estimatedFare)}*`
    ].join('\n');

    const whatsappLink = `https://wa.me/5521979447509?text=${encodeURIComponent(whatsappMessage)}`;

    showResult(`
      <h2>Resultado da consulta</h2>
      <p class="status-ok">Confira os dados da corrida</p>
      <ul class="result-list">
        <li><strong>Cliente:</strong> ${fullName}</li>
        <li><strong>WhatsApp:</strong> ${whatsapp}</li>
        <li><strong>Trecho:</strong> ${tripLabel}</li>
        <li><strong>Distância cobrada:</strong> ${chargedDistanceKm.toFixed(2)} km</li>
        <li><strong>Qtd. de Pets:</strong> ${petCount}</li>
        <li><strong>Valor estimado da corrida:</strong> ${formatCurrency(estimatedFare)}</li>
      </ul>
      <a class="whatsapp-cta" href="${whatsappLink}" target="_blank" rel="noopener noreferrer">Agendar corrida</a>
      <p><small>Cálculo de distância realizado via serviços públicos de geolocalização.</small></p>
    `);
  } catch (error) {
    showResult(`
      <h2>Não foi possível gerar a cotação agora</h2>
      <p class="status-warn">${error.message}</p>
      <p>Verifique os dados informados e tente novamente.</p>
    `);
  }
});
