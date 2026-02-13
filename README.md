# PetRide (esboço)

Protótipo simples de aplicativo web para **agendamento de corridas para transporte de PET em veículo particular**.

## O que este esboço cobre

- Formulário com os dados solicitados:
  - Nome completo e WhatsApp
  - Origem (endereço, número e CEP)
  - Destino (endereço, número e CEP)
  - Data e hora
  - Descrição com quantidade/especificação dos pets
  - Opção de ida ou ida e volta
- Validação de agenda:
  - Data somente de hoje em diante
  - Para hoje, horário com no mínimo 30 minutos de antecedência
- Cálculo de quilometragem com **Google Maps API**
- Cotação com regras:
  - **R$ 3,50 por km**
  - **Valor mínimo de corrida: R$ 35,00**
  - **Adicional de R$ 20,00 para ida e volta**

## Como rodar

```bash
python3 -m http.server 8000
```

Depois abra: <http://localhost:8000>

## Configuração da API do Google

No arquivo `script.js`, configure a constante:

```js
const GOOGLE_MAPS_API_KEY = 'SUA_CHAVE_GOOGLE_AQUI';
```

Use uma chave com Google Maps JavaScript API habilitada no projeto do Google Cloud.

## Observações importantes

- Este protótipo depende de internet.
- A disponibilidade de motorista usa regra demonstrativa local.
