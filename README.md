# PetRide (esboço)

Protótipo simples de aplicativo web para **agendamento de corridas para transporte de PET em veículo particular**.

## O que este esboço cobre

- Formulário com os dados solicitados:
  - Autocomplete (predição) para endereço de origem e destino
  - Nome completo e WhatsApp
  - Origem (endereço e CEP)
  - Destino (endereço e CEP)
  - Data e hora
  - Objetivo da corrida (menu com opções + campo opcional para "Outros")
  - Detalhes da corrida (campo opcional)
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
  - **Só ida acima de 50 km:** adicional de R$ 0,50 por km (retorno estimado)
  - **Tarifa base para ida e volta: R$ 55,00 + km dos percursos**
  - **Ida e volta (espera):**
    - > 20 min e < 1h: +R$ 20,00
    - > 1h e < 3h: +R$ 20,00 + R$ 4,00 por bloco de 10 min
    - > 3h: +R$ 20,00 + R$ 3,00 por bloco de 10 min

## Como rodar

```bash
python3 -m http.server 8000
```

Depois abra: <http://localhost:8000>

## Observações importantes

- Este protótipo depende de internet.
- APIs públicas podem ter indisponibilidade pontual.
- O botão de CTA do WhatsApp já abre com as informações da corrida preenchidas na mensagem.


## Layout mobile-first

- Interface organizada em etapas (Rota, Tipo/Horário, Passageiro).
- Botão principal fixo no rodapé, no padrão de apps de transporte.
- Bloco de retorno (data/hora da volta) exibido apenas para ida e volta.
