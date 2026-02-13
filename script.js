const form = document.querySelector('#booking-form');
const resultContainer = document.querySelector('#result');
const dateInput = document.querySelector('#date');
const timeInput = document.querySelector('#time');

const PRICE_PER_KM = 3.5;
const MIN_FARE = 35;
const ROUND_TRIP_SURCHARGE = 20;

function parsePetCount(text) {
  const numbers = text.match(/\d+/g);
  if (!numbers) return 1;
  return numbers.map(Number).reduce((acc, n) => acc + n, 0);
}

function isDriverAvailable(dateValue, timeValue) {
  const [hour] = timeValue.split(':').map(Number);
  const date = new Date(`${dateValue}T${timeValue}`);

  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const inWorkingHours = hour >= 7 && hour <= 21;

  return inWorkingHours && !(isWeekend && hour > 18);
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

async function geocodeAddress(address) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Falha ao consultar coordenadas do endereço.');
  }

  const data = await response.json();
  if (!data.length) {
    throw new Error(`Endereço não encontrado: ${address}`);
  }

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon)
  };
}

async function calculateRouteDistanceKm(origin, destination) {
  const originPoint = await geocodeAddress(origin);
  const destinationPoint = await geocodeAddress(destination);

  const routeUrl = new URL(
    `https://router.project-osrm.org/route/v1/driving/${originPoint.lon},${originPoint.lat};${destinationPoint.lon},${destinationPoint.lat}`
  );
  routeUrl.searchParams.set('overview', 'false');
  routeUrl.searchParams.set('alternatives', 'false');

  const routeResponse = await fetch(routeUrl);
  if (!routeResponse.ok) {
    throw new Error('Falha ao calcular rota real entre origem e destino.');
  }

  const routeData = await routeResponse.json();
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

dateInput.addEventListener('change', updateDateAndTimeLimits);
updateDateAndTimeLimits();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const fullName = formData.get('fullName').trim();
  const whatsapp = formData.get('whatsapp').trim();
  const origin = formData.get('origin').trim();
  const destination = formData.get('destination').trim();
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
    const available = isDriverAvailable(date, time);

    const oneWayDistanceKm = await calculateRouteDistanceKm(origin, destination);
    const chargedDistanceKm = roundTrip ? oneWayDistanceKm * 2 : oneWayDistanceKm;

    const distanceFare = chargedDistanceKm * PRICE_PER_KM;
    const petSurcharge = petCount > 1 ? (petCount - 1) * 6 : 0;
    const roundTripSurcharge = roundTrip ? ROUND_TRIP_SURCHARGE : 0;
    const estimatedFare = Math.max(MIN_FARE, distanceFare + petSurcharge + roundTripSurcharge);

    showResult(`
      <h2>Resultado da consulta</h2>
      <p class="${available ? 'status-ok' : 'status-warn'}">
        ${available ? 'Motorista disponível para o horário solicitado.' : 'Horário com baixa disponibilidade. Recomendamos ajustar o horário.'}
      </p>
      <ul class="result-list">
        <li><strong>Cliente:</strong> ${fullName}</li>
        <li><strong>WhatsApp:</strong> ${whatsapp}</li>
        <li><strong>Trecho:</strong> ${roundTrip ? 'Ida e volta' : 'Só ida'}</li>
        <li><strong>Distância real (ida):</strong> ${oneWayDistanceKm.toFixed(2)} km</li>
        <li><strong>Distância cobrada:</strong> ${chargedDistanceKm.toFixed(2)} km</li>
        <li><strong>Tarifa base:</strong> ${formatCurrency(PRICE_PER_KM)}/km (mínimo ${formatCurrency(MIN_FARE)})</li>
        <li><strong>Adicional ida e volta:</strong> ${formatCurrency(roundTripSurcharge)}</li>
        <li><strong>Qtd. estimada de pets:</strong> ${petCount}</li>
        <li><strong>Cotação estimada:</strong> ${formatCurrency(estimatedFare)}</li>
      </ul>
      <a class="whatsapp-cta" href="https://wa.me/5521979447509" target="_blank" rel="noopener noreferrer">Agendar corrida</a>
      <p><small>Observação: cálculo de rota via OpenStreetMap (Nominatim + OSRM). Pode variar conforme trânsito e rota final do motorista.</small></p>
    `);
  } catch (error) {
    showResult(`
      <h2>Não foi possível gerar a cotação agora</h2>
      <p class="status-warn">${error.message}</p>
      <p>Verifique os dados informados e tente novamente.</p>
    `);
  }
});
