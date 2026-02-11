const form = document.querySelector('#booking-form');
const resultContainer = document.querySelector('#result');

function parsePetCount(text) {
  const numbers = text.match(/\d+/g);
  if (!numbers) return 1;
  return numbers.map(Number).reduce((acc, n) => acc + n, 0);
}

function estimateDistance(origin, destination) {
  const combined = `${origin}${destination}`.length;
  return Math.max(3, Math.round(combined * 0.45));
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

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const origin = formData.get('origin').trim();
  const destination = formData.get('destination').trim();
  const date = formData.get('date');
  const time = formData.get('time');
  const petsDescription = formData.get('pets').trim();
  const roundTrip = formData.get('roundTrip') === 'sim';

  const petCount = parsePetCount(petsDescription);
  const distanceKm = estimateDistance(origin, destination);
  const available = isDriverAvailable(date, time);

  const baseFare = 18;
  const perKm = 3.8;
  const petSurcharge = petCount > 1 ? (petCount - 1) * 6 : 0;
  const roundTripMultiplier = roundTrip ? 1.85 : 1;
  const estimatedFare = (baseFare + distanceKm * perKm + petSurcharge) * roundTripMultiplier;

  resultContainer.classList.remove('hidden');
  resultContainer.innerHTML = `
    <h2>Resultado da consulta</h2>
    <p class="${available ? 'status-ok' : 'status-warn'}">
      ${available ? 'Motorista disponível para o horário solicitado.' : 'Horário com baixa disponibilidade. Recomendamos ajustar o horário.'}
    </p>
    <ul class="result-list">
      <li><strong>Trecho:</strong> ${roundTrip ? 'Ida e volta' : 'Só ida'}</li>
      <li><strong>Distância estimada:</strong> ${distanceKm} km</li>
      <li><strong>Qtd. estimada de pets:</strong> ${petCount}</li>
      <li><strong>Cotação estimada:</strong> ${formatCurrency(estimatedFare)}</li>
      <li><strong>Observação:</strong> confirmação final depende da validação real do motorista.</li>
    </ul>
  `;

  resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
