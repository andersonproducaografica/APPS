const form = document.querySelector('#booking-form');
const resultContainer = document.querySelector('#result');
const dateInput = document.querySelector('#date');
const timeInput = document.querySelector('#time');

const PRICE_PER_KM = 3.5;
const MIN_FARE = 35;
const ROUND_TRIP_SURCHARGE = 20;

// Substitua por sua chave válida do Google Maps Platform.
const GOOGLE_MAPS_API_KEY = 'AKfycbw3lRDhAB7snSFmi0O6uICdi9GYHQ3Rr-xCOcxN0oft4_COp0Ve4S3RV0xiUtlPK3M';

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

function buildAddress(street, number, zip) {
  const cleanZip = normalizeZip(zip);
  return `${street}, ${number}, ${cleanZip}, Brasil`;
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

function ensureGoogleMapsLoaded() {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'SUA_CHAVE_GOOGLE_AQUI') {
    throw new Error('Configure sua chave da API do Google Maps para calcular a rota.');
  }

  if (window.google?.maps?.Geocoder && window.google?.maps?.DistanceMatrixService) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Falha ao carregar Google Maps.')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar Google Maps.'));
    document.head.appendChild(script);
  });
}

function geocodeAddressGoogle(geocoder, address) {
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address, region: 'br' }, (results, status) => {
      if (status === 'OK' && results?.length) {
        resolve(results[0].geometry.location);
      } else {
        reject(new Error(`Não foi possível localizar o endereço: ${address}.`));
      }
    });
  });
}

function calculateDistanceGoogle(distanceService, originLocation, destinationLocation) {
  return new Promise((resolve, reject) => {
    distanceService.getDistanceMatrix(
      {
        origins: [originLocation],
        destinations: [destinationLocation],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
        region: 'br'
      },
      (response, status) => {
        if (status !== 'OK') {
          reject(new Error('Falha ao calcular rota no Google Maps.'));
          return;
        }

        const element = response?.rows?.[0]?.elements?.[0];
        if (!element || element.status !== 'OK' || !element.distance?.value) {
          reject(new Error('Não foi possível calcular distância da rota.'));
          return;
        }

        resolve(element.distance.value / 1000);
      }
    );
  });
}

async function calculateRouteDistanceKm(origin, destination) {
  await ensureGoogleMapsLoaded();

  const geocoder = new window.google.maps.Geocoder();
  const distanceService = new window.google.maps.DistanceMatrixService();

  const originAddress = buildAddress(origin.street, origin.number, origin.zip);
  const destinationAddress = buildAddress(destination.street, destination.number, destination.zip);

  const originLocation = await geocodeAddressGoogle(geocoder, originAddress);
  const destinationLocation = await geocodeAddressGoogle(geocoder, destinationAddress);

  return calculateDistanceGoogle(distanceService, originLocation, destinationLocation);
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

    showResult(`
      <h2>Resultado da consulta</h2>
      <p class="status-ok">Confira os dados da corrida</p>
      <ul class="result-list">
        <li><strong>Cliente:</strong> ${fullName}</li>
        <li><strong>WhatsApp:</strong> ${whatsapp}</li>
        <li><strong>Trecho:</strong> ${roundTrip ? 'Ida e volta' : 'Só ida'}</li>
        <li><strong>Distância cobrada:</strong> ${chargedDistanceKm.toFixed(2)} km</li>
        <li><strong>Qtd. de Pets:</strong> ${petCount}</li>
        <li><strong>Valor estimado da corrida:</strong> ${formatCurrency(estimatedFare)}</li>
      </ul>
      <a class="whatsapp-cta" href="https://wa.me/5521979447509" target="_blank" rel="noopener noreferrer">Agendar corrida</a>
      <p><small>Cálculo de distância realizado via Google Maps.</small></p>
    `);
  } catch (error) {
    showResult(`
      <h2>Não foi possível gerar a cotação agora</h2>
      <p class="status-warn">${error.message}</p>
      <p>Verifique os dados informados e tente novamente.</p>
    `);
  }
});
