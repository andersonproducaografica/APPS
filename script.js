const form = document.querySelector('#booking-form');
const resultContainer = document.querySelector('#result');
const dateInput = document.querySelector('#date');
const timeInput = document.querySelector('#time');
const originStreetInput = document.querySelector('#originStreet');
const destinationStreetInput = document.querySelector('#destinationStreet');
const originStreetSuggestions = document.querySelector('#originStreetSuggestions');
const destinationStreetSuggestions = document.querySelector('#destinationStreetSuggestions');
const returnScheduleSection = document.querySelector('#return-schedule');
const returnDateInput = document.querySelector('#returnDate');
const returnTimeInput = document.querySelector('#returnTime');
const roundTripRadios = document.querySelectorAll('input[name="roundTrip"]');
const tripPurposeSelect = document.querySelector('#tripPurpose');
const purposeOtherWrap = document.querySelector('#purpose-other-wrap');
const purposeOtherInput = document.querySelector('#purposeOther');
const cpfInput = document.querySelector('#cpf');

const PRICE_PER_KM = 3.5;
const MIN_FARE_ONE_WAY = 35;
const ROUND_TRIP_BASE_FARE = 55;

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


function formatDateBR(dateValue) {
  const [year, month, day] = dateValue.split('-');
  return `${day}/${month}/${year}`;
}


function isRoundTripSelected() {
  const selected = document.querySelector('input[name="roundTrip"]:checked');
  return selected?.value === 'sim';
}

function toggleReturnScheduleFields() {
  const enabled = isRoundTripSelected();
  returnScheduleSection.classList.toggle('hidden', !enabled);
  returnDateInput.required = enabled;
  returnTimeInput.required = enabled;

  if (!enabled) {
    returnDateInput.value = '';
    returnTimeInput.value = '';
    returnDateInput.removeAttribute('min');
    returnTimeInput.removeAttribute('min');
  }
}


function togglePurposeOtherField() {
  const isOther = tripPurposeSelect.value === 'Outros';
  purposeOtherWrap.classList.toggle('hidden', !isOther);
  if (!isOther) {
    purposeOtherInput.value = '';
  }
}

function calculateWaitSurcharge(rideDate, rideTime, returnDate, returnTime) {
  if (!returnDate || !returnTime) return 0;

  const outbound = new Date(`${rideDate}T${rideTime}`);
  const inbound = new Date(`${returnDate}T${returnTime}`);
  const waitMinutes = Math.floor((inbound - outbound) / 60000);

  return waitMinutes < 80 ? 20 : 0;
}

function maskCpf(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function validateReturnAfterOutbound(rideDate, rideTime, returnDate, returnTime) {
  const outbound = new Date(`${rideDate}T${rideTime}`);
  const inbound = new Date(`${returnDate}T${returnTime}`);

  if (inbound <= outbound) {
    throw new Error('A data/hora da volta deve ser posterior à data/hora da ida.');
  }
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

function buildAddressQueries(street, zip, zipInfo) {
  const cleanZip = normalizeZip(zip);
  const cityState = zipInfo?.city && zipInfo?.state ? `${zipInfo.city} ${zipInfo.state}` : '';
  const neighborhood = zipInfo?.neighborhood || '';

  return [
    `${street}, ${cleanZip}, Brasil`,
    `${street}, ${neighborhood}, ${cityState}, Brasil`,
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

  const suggestions = data
    .map((item) => {
      const street = item.address?.road || item.address?.pedestrian || item.name || item.display_name?.split(',')[0] || '';
      const cleanedStreet = street.replace(/\d+/g, '').replace(/\s{2,}/g, ' ').trim();
      const zip = normalizeZip(item.address?.postcode || '');
      return {
        street: cleanedStreet,
        zip
      };
    })
    .filter((item) => item.street);

  const unique = [];
  const seen = new Set();
  for (const item of suggestions) {
    if (seen.has(item.street)) continue;
    seen.add(item.street);
    unique.push(item);
    if (unique.length === 5) break;
  }

  return unique;
}

function setupAddressAutocomplete(inputEl, datalistEl) {
  const streetZipMap = new Map();
  const zipInput = inputEl.id === 'originStreet'
    ? document.querySelector('#originZip')
    : document.querySelector('#destinationZip');

  let debounceTimer;

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const suggestions = await fetchAddressSuggestions(inputEl.value);
      streetZipMap.clear();
      suggestions.forEach((item) => {
        if (item.zip?.length === 8) {
          streetZipMap.set(item.street.toLowerCase(), item.zip);
        }
      });
      datalistEl.innerHTML = suggestions.map((item) => `<option value="${item.street.replace(/"/g, '&quot;')}"></option>`).join('');
    }, 320);
  });

  inputEl.addEventListener('change', () => {
    const zipFromStreet = streetZipMap.get(inputEl.value.trim().toLowerCase());
    if (zipFromStreet && zipInput) {
      zipInput.value = zipFromStreet.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
  });

  inputEl.addEventListener('blur', () => {
    clearTimeout(debounceTimer);
  });
}

async function geocodeAddressWithFallback(street, zip) {
  const zipInfo = await lookupZipInfo(zip);
  const queries = buildAddressQueries(street, zip, zipInfo);

  for (const query of queries) {
    const nominatimResult = await geocodeByNominatim(query);
    if (nominatimResult) return nominatimResult;

    const photonResult = await geocodeByPhoton(query);
    if (photonResult) return photonResult;
  }

  throw new Error(`Não foi possível localizar o endereço: ${street}, ${zip}.`);
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

  if (isRoundTripSelected()) {
    returnDateInput.min = dateInput.value || today;

    if (returnDateInput.value === today) {
      const minReturnTime = toTimeInputValue(new Date(now.getTime() + 30 * 60 * 1000));
      returnTimeInput.min = minReturnTime;
      if (returnTimeInput.value && returnTimeInput.value < minReturnTime) {
        returnTimeInput.value = minReturnTime;
      }
    } else {
      returnTimeInput.removeAttribute('min');
    }
  }
}

function validateSchedule(dateValue, timeValue, label = 'ida') {
  const now = new Date();
  const schedule = new Date(`${dateValue}T${timeValue}`);

  const today = toLocalDateInputValue(now);
  if (dateValue < today) {
    throw new Error(`A data da ${label} deve ser hoje ou uma data futura.`);
  }

  if (dateValue === today) {
    const minSchedule = new Date(now.getTime() + 30 * 60 * 1000);
    if (schedule < minSchedule) {
      throw new Error(`Para hoje, selecione um horário da ${label} com pelo menos 30 minutos de antecedência.`);
    }
  }
}

async function calculateRouteDistanceKm(origin, destination) {
  const originPoint = await geocodeAddressWithFallback(origin.street, origin.zip);
  const destinationPoint = await geocodeAddressWithFallback(destination.street, destination.zip);

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

roundTripRadios.forEach((radio) => radio.addEventListener('change', () => {
  toggleReturnScheduleFields();
  updateDateAndTimeLimits();
}));
tripPurposeSelect.addEventListener('change', togglePurposeOtherField);
dateInput.addEventListener('change', updateDateAndTimeLimits);
returnDateInput.addEventListener('change', updateDateAndTimeLimits);
toggleReturnScheduleFields();
togglePurposeOtherField();
updateDateAndTimeLimits();

cpfInput.addEventListener('input', () => {
  cpfInput.value = maskCpf(cpfInput.value);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const fullName = formData.get('fullName').trim();
  const cpf = formData.get('cpf').trim();
  const whatsapp = formData.get('whatsapp').trim();
  const origin = {
    street: formData.get('originStreet').trim(),
    zip: formData.get('originZip').trim()
  };
  const destination = {
    street: formData.get('destinationStreet').trim(),
    zip: formData.get('destinationZip').trim()
  };
  const date = formData.get('date');
  const time = formData.get('time');
  const returnDate = formData.get('returnDate');
  const returnTime = formData.get('returnTime');
  const tripPurpose = formData.get('tripPurpose');
  const purposeOther = formData.get('purposeOther').trim();
  const rideNotes = formData.get('pets').trim();
  const roundTrip = formData.get('roundTrip') === 'sim';

  showResult(`
    <h2>Processando solicitação</h2>
    <p>Calculando distância real da rota e cotação...</p>
  `);

  try {
    validateSchedule(date, time, 'ida');
    if (roundTrip) {
      validateSchedule(returnDate, returnTime, 'volta');
      validateReturnAfterOutbound(date, time, returnDate, returnTime);
    }

    const petCount = rideNotes ? parsePetCount(rideNotes) : 1;
    const oneWayDistanceKm = await calculateRouteDistanceKm(origin, destination);
    const chargedDistanceKm = roundTrip ? oneWayDistanceKm * 2 : oneWayDistanceKm;

    const distanceFare = chargedDistanceKm * PRICE_PER_KM;
    const petSurcharge = petCount > 1 ? (petCount - 1) * 6 : 0;

    const oneWayLongDistanceSurcharge = !roundTrip && oneWayDistanceKm > 50
      ? oneWayDistanceKm * 0.5
      : 0;
    const waitSurcharge = roundTrip
      ? calculateWaitSurcharge(date, time, returnDate, returnTime)
      : 0;

    const estimatedFare = roundTrip
      ? ROUND_TRIP_BASE_FARE + distanceFare + petSurcharge + waitSurcharge
      : Math.max(MIN_FARE_ONE_WAY, distanceFare + petSurcharge + oneWayLongDistanceSurcharge);

    const tripLabel = roundTrip ? 'Ida e volta' : 'Só ida';
    const purposeText = tripPurpose === 'Outros' ? `Outros (${purposeOther || 'não detalhado'})` : tripPurpose;
    const formattedDate = formatDateBR(date);
    const formattedReturnDate = returnDate ? formatDateBR(returnDate) : '';
    const originText = `${origin.street} - CEP ${origin.zip}`;
    const destinationText = `${destination.street} - CEP ${destination.zip}`;

    const whatsappMessage = [
      '*Olá,*',
      `Me chamo, *${fullName}*.` ,
      `CPF: ${cpf}`,
      '*Gostaria de agendar uma corrida*',
      '',
      ...(roundTrip
        ? [
            `IDA: ${formattedDate} às ${time}`,
            `Origem: ${originText}`,
            `Destino: ${destinationText}`,
            '',
            `VOLTA: ${formattedReturnDate} às ${returnTime}`,
            `Origem: ${destinationText}`,
            `Destino: ${originText}`
          ]
        : [
            `Para: *${formattedDate} às ${time}*`,
            `Origem: ${originText}`,
            `Destino: ${destinationText}`,
            `Trecho: ${tripLabel}`
          ]),
      `Finalidade da corrida: ${purposeText}`,
      `Detalhes da corrida: ${rideNotes || 'Não informado'}`,
      ...(oneWayLongDistanceSurcharge ? [`Adicional retorno estimado (>50km): ${formatCurrency(oneWayLongDistanceSurcharge)}`] : []),
      `Valor estimado da corrida: *${formatCurrency(estimatedFare)}*`
    ].join('\n');

    const whatsappLink = `https://wa.me/5521979447509?text=${encodeURIComponent(whatsappMessage)}`;

    showResult(`
      <h2>Resultado da consulta</h2>
      <ul class="result-list">
        <li><strong>Cliente:</strong> ${fullName}</li>
        <li><strong>CPF:</strong> ${cpf}</li>
        <li><strong>WhatsApp:</strong> ${whatsapp}</li>
        <li><strong>Data/Hora (ida):</strong> ${formattedDate} às ${time}</li>
        ${roundTrip ? `<li><strong>Data/Hora (volta):</strong> ${formattedReturnDate} às ${returnTime}</li>` : ''}
        <li><strong>Trecho:</strong> ${tripLabel}</li>
        <li><strong>Finalidade da corrida:</strong> ${purposeText}</li>
        <li><strong>Distância cobrada:</strong> ${chargedDistanceKm.toFixed(2)} km</li>
        ${rideNotes ? `<li><strong>Detalhes da corrida:</strong> ${rideNotes}</li>` : ''}
        ${oneWayLongDistanceSurcharge ? `<li><strong>Adicional retorno estimado (>50km):</strong> ${formatCurrency(oneWayLongDistanceSurcharge)}</li>` : ''}
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
