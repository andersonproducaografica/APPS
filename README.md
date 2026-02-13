# PetRide (esboço)

Protótipo simples de aplicativo web para **agendamento de corridas para transporte de PET em veículo particular**.

## O que este esboço cobre

- Formulário com os dados solicitados:
  - Autocomplete (predição) para endereço de origem e destino
  - Nome completo e WhatsApp
  - Origem (endereço e CEP)
  - Destino (endereço e CEP)
  - Data e hora
  - Observações da corrida (campo opcional)
  - Opção de ida ou ida e volta
- Validação de agenda:
  - Data somente de hoje em diante
  - Para hoje, horário com no mínimo 30 minutos de antecedência
- Cálculo de quilometragem com fallback de geolocalização:
  - ViaCEP (enriquecimento por CEP)
  - Nominatim (OpenStreetMap)
  - Photon (komoot)
  - OSRM (distância de rota)
- Cotação com regras:
  - **R$ 3,50 por km**
  - **Valor mínimo de corrida (só ida): R$ 35,00**
  - **Tarifa base para ida e volta: R$ 55,00 + km dos percursos**

## Como rodar

```bash
python3 -m http.server 8000
```

Depois abra: <http://localhost:8000>

## Observações importantes

- Este protótipo depende de internet.
- APIs públicas podem ter indisponibilidade pontual.
- O botão de CTA do WhatsApp já abre com as informações da corrida preenchidas na mensagem.
