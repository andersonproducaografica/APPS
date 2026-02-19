# PetRide (esboço)

Protótipo simples de aplicativo web para **agendamento de corridas para transporte de PET em veículo particular**.

## O que este esboço cobre

- Formulário com os dados solicitados:
  - Autocomplete (predição) para endereço de origem e destino com preenchimento automático de CEP quando disponível
  - Nome completo, CPF e WhatsApp
  - Origem (endereço, CEP e cidade)
  - Destino (endereço, CEP e cidade)
  - Data e hora
  - Finalidade da corrida (menu com opções + campo opcional para "Outros")
  - Detalhes da corrida (campo opcional)
  - Opção de ida ou ida e volta
- Validação de agenda:
  - Data somente de hoje em diante
  - Para hoje, horário com no mínimo 30 minutos de antecedência
- Cálculo de quilometragem com fallback de geolocalização:
  - ViaCEP (enriquecimento por CEP)
  - Nominatim (OpenStreetMap) com recorte geográfico para o estado do RJ e tentativas por regiões (Metropolitana, Lagos, Serrana e Costa Verde)
  - Photon (komoot)
  - OSRM (distância de rota)
- Cotação com regras:
  - **R$ 3,50 por km**
  - **Valor mínimo de corrida (só ida): R$ 35,00**
  - **Só ida acima de 50 km:** adicional de R$ 0,50 por km (retorno estimado)
  - **Tarifa base para ida e volta: R$ 55,00 + km dos percursos**
  - **Ida e volta (espera):** se o intervalo entre ida e volta for inferior a 1h20, aplica +R$ 20,00 fixo; acima desse tempo não há adicional de espera

## Como rodar

```bash
python3 -m http.server 8000
```

Depois abra: <http://localhost:8000>

## Observações importantes

- Este protótipo depende de internet.
- APIs públicas podem ter indisponibilidade pontual.
- O botão de CTA do WhatsApp já abre com as informações da corrida preenchidas na mensagem.
- Após o resultado, o botão principal é ocultado e aparece `Fazer nova consulta` abaixo do CTA de WhatsApp.


## Layout mobile-first

- Rodapé fixo com crédito: `Desenvolvido por: Anderson Ramos`.

- Interface organizada em etapas (Rota, Tipo/Horário, Passageiro).
- Botão principal fixo no rodapé, no padrão de apps de transporte.
- Bloco de retorno (data/hora da volta) exibido apenas para ida e volta.
