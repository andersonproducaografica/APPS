# PetRide (esboço)

Protótipo simples de aplicativo web para **agendamento de corridas para transporte de PET em veículo particular**.

## O que este esboço cobre

- Formulário com os dados solicitados:
  - Endereço de origem
  - Endereço de destino
  - Data e hora
  - Descrição com quantidade/especificação dos pets
  - Opção de ida ou ida e volta
- Validação básica de disponibilidade do motorista (regra simulada)
- **Cálculo de quilometragem real** via APIs públicas:
  - Geocodificação: OpenStreetMap Nominatim
  - Roteamento: OSRM
- Cotação com regras:
  - **R$ 3,50 por km**
  - **Valor mínimo de corrida: R$ 35,00**

## Como rodar

```bash
python3 -m http.server 8000
```

Depois abra: <http://localhost:8000>

## Observações importantes

- Este protótipo depende de internet para consultar a quilometragem real.
- As APIs públicas podem aplicar limite de uso.
- A disponibilidade do motorista ainda usa uma regra demonstrativa local.
