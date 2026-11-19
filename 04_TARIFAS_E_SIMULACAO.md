# 04 — Tarifas e matemática da corrida BicoMob (DEMONSTRAÇÃO)

## Preços de referência informados no briefing

- Corrida urbana típica em Araguatins, valores indicados pelo idealizador: **moto R$ 10**, **carro R$ 20**.
- Ida do Centro ao IFTO (~5 km, referência do idealizador): **moto R$ 20**, **carro R$ 50**.
- BicoMob se posiciona como alternativa mais acessível; não apresentar os valores como pesquisa oficial de mercado ou garantia de renda de motoristas.

## Tabela de configuração do cálculo

| Parâmetro | Moto | Carro |
|---|---:|---:|
| Tarifa base | R$ 3,00 | R$ 5,00 |
| Por km | R$ 1,60 | R$ 3,20 |
| Por minuto | R$ 0,15 | R$ 0,25 |
| Corrida mínima | R$ 7,00 | R$ 13,00 |
| Suplemento de destino IFTO (DEMO, configurável) | +R$ 2,50 | +R$ 6,50 |

**Fórmula a implementar:**

```ts
interface FareConfig { base: number; perKm: number; perMinute: number; minimum: number; }
const fare = Math.round((
  Math.max(cfg.minimum, cfg.base + routeDistanceKm * cfg.perKm + durationMin * cfg.perMinute)
  + (isIftoZone ? iftoFee : 0)
) * 100) / 100;
```

- Todas as distâncias não negativas e minutos > 0. Se rota não encontrada, identificar claramente o estimado ou impedir tarifa exata.
- Calcular o mínimo **antes** do suplemento especial (conforme fórmula) e explicar no detalhamento.
- `isIftoZone`: verdadeiro para destino ou origem correspondendo ao **IFTO Campus Araguatins**, escolhido por ID curado ou proximidade ao ponto validado (raio configurável de ex. 500 metros). Evitar acionar taxa apenas porque a string contém `ifto` em qualquer outra cidade.
- Em rota IFTO ↔ Centro, aplicar o suplemento **uma vez**. Sem taxa dupla.
- Sempre usar `Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})`. Arredondar apenas o total final.
- A tarifa mostrada na escolha deve ser exatamente a tarifa registrada no pedido e na corrida concluída.

## Exemplos comprováveis

**Exemplo 1, percurso urbano 2,0 km e 6 minutos, sem IFTO:**

- Moto: `max(7, 3+2×1,60+6×0,15) = max(7, 7,10)` → **R$ 7,10**.
- Carro: `max(13, 5+2×3,20+6×0,25) = max(13, 12,90)` → **R$ 13,00**.

**Exemplo 2, percurso até IFTO com distância demonstrativa 5,0 km e 10 minutos:**

- Moto: `max(7, 3+5×1,60+10×0,15)+2,50 = 12,50+2,50` → **R$ 15,00**.
- Carro: `max(13, 5+5×3,20+10×0,25)+6,50 = 23,50+6,50` → **R$ 30,00**.

**Exemplo 3, IFTO com 5,0 km e 11 minutos (cenário dos mockups):**

- Moto: `3+8+1,65+2,50` → **R$ 15,15**.
- Carro: `5+16+2,75+6,50` → **R$ 30,25**.

**IMPORTANTE:** alguns screenshots de referência apresentam **R$ 14,90 / R$ 29,90**. São apenas amostras de design, não saídas matemáticas da fórmula acima. **Não falsificar o cálculo para bater com a imagem.** No site, a regra, distância e duração calculadas determinam o preço.

## Tarifa especial IFTO: por que essa configuração?

O briefing citava suplementação como hipótese (exemplo +R$ 4 / +R$ 10), mas também sugeria preço total de aproximadamente **R$ 15 e R$ 30** para o trajeto de 5 km. Com base + km + tempo, adicionar +R$ 4/+R$ 10 ultrapassaria essa faixa. Para manter a demonstração **matematicamente coerente** e próxima dos preços-alvo, usar +R$ 2,50/+R$ 6,50 como parâmetros iniciais **de demo**. O código deve centralizar essas constantes para futura alteração.

Se for importante demonstrar o cenário com +R$ 4/+R$ 10, ele pode ser exposto como **simulação alternativa explicitamente selecionada**, jamais misturado aos preços padrão da primeira versão.

## Elementos UI do cálculo

- Card **Moto**: foto/ícone de moto, tipo, ETA aproximado, valor total.
- Card **Carro**: foto/ícone de carro, descrição, valor total.
- Link no card: **“Como esse preço foi calculado?”** → mini bottom sheet com as linhas: valor base, quilometragem × R$/km, minutos × R$/min, ajuste à mínima (quando aplicado), taxa IFTO (quando aplicável), valor final.
- Nota curta: **“Tarifas simuladas para apresentação. Valores não constituem oferta de transporte.”**
- Comparativo de economia é opcional: se exibido, identificar valor de referência como **“Informado no briefing, não verificado”** e explicar que a diferença depende do trajeto e das premissas.

## Função/testes mínimos

Criar função pura `calculateFare(category, km, minutes, isIftoZone)` e testes para: tarifa mínima, dois preços urbanos, IFTO, duas categorias, entradas inválidas, formatação em BRL, total preservado entre telas.
