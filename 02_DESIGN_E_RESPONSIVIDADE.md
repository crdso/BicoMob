# 02 — Design system e enquadramento de celular

## Direção de arte

A referência é a **hierarquia minimalista de um aplicativo de corridas moderno**: busca enorme e rápida, destinos favoritos, sugestões em quadradinhos, mapa, precificação, bottom sheets, motorista/veículo e tabs. A marca deve ser **BicoMob**, não Uber. Use os PNGs apenas como moodboard das telas aprovadas visualmente.

### Paleta

| Token | Cor | Aplicação |
|---|---|---|
| `--primary` | `#7FFF00` | CTA, ícone ativo, linha do trajeto, preço selecionado |
| `--bg` | `#0B0C0D` | Fundo principal |
| `--surface` | `#191B1D` | Cartões e sheets |
| `--surface-2` | `#25282A` | Campos, tiles e divisores suaves |
| `--text` | `#F8FAF8` | Títulos e conteúdo |
| `--muted` | `#9B9FA3` | Informações secundárias |
| `--stroke` | `rgba(255,255,255,.12)` | Bordas discretas |
| `--danger` | `#FE6262` | Avisos de cancelamento/erro |

Verde neon em pontos estratégicos, **sem excesso de glow**. Evite o verde em áreas inteiras de texto e contraste insuficiente.

### Tipografia / espaçamento

- Font: **Inter** ou `system-ui`, pesos 400/500/600/700/800; hierarquia compacta de aplicativo real.
- Títulos de seções: ~20–24px; títulos de tela ~24–28px; corpo 14–16px; labels ~12–13px.
- Raios: `12px` para inputs/ícones, `18–24px` para cartões, `999px` para pílulas/botões importantes.
- Espaçamento principal: 16–22px entre grupos; horizontais ~20px; layout sem grandes espaços vazios.
- Ícones simples do `lucide-react`, espessura coerente; ícones/imagens de veículos com fundo transparente ou recortado.
- Use símbolos do carro de forma original (SVG simples). **Não copiar logotipo proprietário de terceiros.**
- Cards promocionais podem usar foto real licenciada de carro (armazenada no projeto e com a origem/licença documentada) ou arte própria; não usar foto de pessoa real sem licença.

## Comportamento desktop: mockup de celular INTERATIVO

- `@media (min-width: 601px)`: viewport externa ocupa a janela, `display:grid; place-items:center;`.
- Renderizar uma moldura de telefone de aproximadamente **390–420px de largura** e até **820–880px de altura**, respeitando `max-width: calc(100vw - 28px)` e `max-height: calc(100dvh - 28px)`.
- A moldura tem bezel grafite, bordas arredondadas ~44px, contorno fino, sombra e uma **dynamic island/notch** no topo apenas decorativo.
- Dentro da moldura, `.phone-screen` é um flex column com `height:100%`, rolagem interna de conteúdo e overlays contidos na tela. Header e tabs fixam dentro da `phone-screen`, não no viewport inteiro.
- Use `overflow: hidden` no corpo do telefone; `overflow-y:auto; min-height:0;` no corpo rolável e `-webkit-overflow-scrolling: touch`.
- Não deixe Leaflet extrapolar a moldura; ajustar `z-index` de mapas, cards e modais. Atualizar `map.invalidateSize()` após montagem/troca de tela.
- Na página externa: fundo `#060807` com verde muito suave atrás do telefone; só para apresentação. Não criar landing page de produto/desktop à parte.
- Em monitores pequenos, a moldura deve caber sem cortar ações essenciais. Se a altura for insuficiente, reduzir dimensões com CSS e assegurar scroll interno.

## Comportamento celular real: app full screen

- `@media (max-width:600px)`: **remova a moldura, notch, sombra externa e padding externo**. `html, body, #root` com altura adequada; `.phone-shell` largura 100vw / altura 100dvh, radius 0, borda 0.
- Não renderizar a barra de status falsa iOS no celular real. Manter apenas header BicoMob.
- `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)` nos locais corretos.
- Tab bar deve ficar fixa no fundo da interface, com espaço útil e sem cobrir a última opção.
- Confirmar em larguras 320, 360, 390, 430 e 768 CSS px; o texto não deve estourar nem botões extrapolar tela.
- Evitar refresh ao navegar. Nenhuma área horizontal rolável acidental (exceto carrosséis explicitamente horizontais).

## Componentes visuais recomendados

`PhoneShell`, `AppHeader`, `BrandLogo`, `BottomTabs`, `FavoriteLocationRow`, `SearchField`, `CategoryTile`, `PromoCard`, `AddressInputPair`, `MapPanel`, `FareCard`, `FareBreakdown`, `RideStatusSheet`, `DriverCard`, `TripReceipt`, `SettingsRow`, `Toast`, `ConfirmDialog`.

## Interações e transições

- Selecionar Moto/Carro muda borda para `#7FFF00` e preço em destaque.
- Bottom sheet sobre mapa usa sombra e raio 24px, com drag handle apenas decorativo, a menos que drag seja realmente implementado.
- “Procurando motorista...” exibe animação curta e nada piscando agressivamente.
- Trocas de tela podem usar fade + movimento de 8px com duração de ~150–250ms.
- `prefers-reduced-motion` deve desabilitar/reduzir animações.

## Nível de fidelidade

As cinco referências BicoMob são **inspiração de composição**. Não copie a moldura de iPhone que está dentro dos PNGs para dentro do mockup de telefone novo. Não transforme cada screenshot em um poster; a interface deve ser **construída do zero e clicável**. A cidade representada em gráficos dos mockups **não é cartografia verificável**.
