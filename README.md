# BicoMob — site demonstrativo (Araguatins, TO)

Site responsivo que **simula** um app de corridas de moto e carro. É uma demonstração: não há motoristas reais, login, pagamento, backend nem rastreamento. (O briefing original do pacote está em `PACOTE_README.md`.)

- **Desktop:** o app aparece dentro de um celular virtual grande e centralizado (tela lógica 430 × 900, como um iPhone moderno). A moldura inteira é ampliada/reduzida de forma uniforme conforme a janela (até 1,1×), então nada é espremido.
- **Celular (≤ 600 px):** sem moldura, interface em 100% da tela (`100dvh`, safe areas).
- Rolagem interna funcional, com barras de rolagem ocultas.

## Como executar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção em dist/
npm run preview    # serve o build
npm test           # testes (tarifas, limite municipal, busca, localização)
npm run icons      # (opcional) baixa de novo os dados dos ícones usados
```

## Stack

React 18 + TypeScript + Vite, CSS próprio, Leaflet + React Leaflet, **Iconify** (`iconify-icon`, Web Component oficial), `localStorage`/`sessionStorage`.

## Pesquisa de locais (dados reais do OpenStreetMap)

Tocar em **Para onde?** abre a busca. Ao digitar (mín. 2 letras, *debounce* de 400 ms, requisições canceladas ao continuar digitando):

| Fonte | Uso | Observações |
|---|---|---|
| **Photon** (photon.komoot.io) | Autocomplete de ruas, avenidas, bairros, escolas, IFTO, hospitais, praças e estabelecimentos **com nome** | Feito para busca-enquanto-digita; usa viés de localização e a caixa do município |
| **Overpass API** | Estabelecimentos e categorias (farmácia, escola, mercado, igreja, banco…) perto do centro | Melhor esforço; consulta dois espelhos em paralelo e usa o primeiro que responder |
| **Nominatim** (público) | **Somente** em busca explícita (botão “Buscar também no OpenStreetMap”), com 1 req/s e cache; reverse geocoding de cliques/GPS | A política proíbe autocomplete no servidor público; por isso não é usado a cada tecla |

- **Limite municipal real:** o polígono do município de Araguatins (relation OSM 336850) é baixado uma vez do Nominatim e fica em cache no navegador. Todo resultado, ponto no mapa ou GPS é testado com *point-in-polygon*; Augustinópolis, Imperatriz, o Pará etc. são rejeitados. Se o polígono não carregar, usa-se uma caixa aproximada (e o app avisa).
- Resultados com nome, endereço e **ícone por categoria**; paginação (8 por vez), limite de 30 resultados, cache de 10 min. Nunca carrega todos os estabelecimentos do município.
- Locais que existem no mapa **sem nome** aparecem pelo tipo (ex.: “Farmácia”) com a rua no endereço. Nada é inventado.
- Não achou? **Escolher no mapa** (com o contorno do município desenhado) aceita qualquer ponto válido.

## Sua localização atual

Na escolha da partida há **Sua localização atual**, usando `navigator.geolocation` (HTTPS ou localhost, com permissão do navegador):

- Autorizada e dentro de Araguatins: preenche a origem com a posição real, mostra o ponto azul no mapa, faz geocodificação reversa para o nome da rua e calcula a rota com a coordenada verdadeira. Depois da autorização, `watchPosition` mantém o ponto azul atualizado.
- Negada, indisponível, tempo esgotado, sem suporte ou sem HTTPS: mensagem clara e escolha manual.
- Fora de Araguatins: informa (inclusive a cidade, quando o reverse geocoding responde) e oferece escolher um ponto no município para experimentar a demo.
- **Nunca assume o Centro** como localização do usuário: a partida só é definida por escolha explícita.
- Privacidade: a posição fica só em memória; não é enviada a nenhum serviço (exceto a coordenada ao Nominatim para obter o nome da rua). No histórico local salva-se apenas uma posição aproximada (3 casas decimais, ~100 m) e sem o nome da rua.

## Tarifas (simulação)

`preço = max(mínimo, base + km × R$/km + min × R$/min) + suplemento IFTO` — constantes em `src/lib/fare.ts`.
Moto: 3,00 + 1,60/km + 0,15/min, mín. 7,00, IFTO +2,50. Carro: 5,00 + 3,20/km + 0,25/min, mín. 13,00, IFTO +6,50.
O suplemento é aplicado uma vez quando origem **ou** destino está na zona IFTO (raio de 500 m). O preço da escolha é o mesmo do pedido, do motorista e do recibo.

## Mapa e rotas

- Tiles OpenStreetMap com atribuição visível (exibidos com filtro CSS escuro; dados originais do OSM).
- Rota viária: OSRM público de demonstração (`router.project-osrm.org`, sem SLA). Se falhar, o mapa real continua, a linha vira **tracejada** com o aviso “Rota de demonstração — percurso viário indisponível” e a distância é uma estimativa em linha reta × 1,3.

## Ícones

Web Component oficial **iconify-icon** (pacote npm, v3). Os dados dos ícones usados (`src/icons/icon-map.json`) são baixados da API do Iconify por `npm run icons` e empacotados em `src/icons/bundle.json`, registrados com `addCollection()`: funcionam offline e sem requisições ao abrir a página. Conjuntos: **Solar** (480 Design, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)) e **Phosphor** (MIT). Os veículos continuam sendo ilustrações SVG próprias.

## Limitações reais

- Os servidores públicos (Photon, Overpass, Nominatim, OSRM) não têm SLA. Durante os testes o `overpass-api.de` respondeu 406 e outros espelhos deram timeout; por isso categorias sem nome no OSM dependem do botão “Buscar também no OpenStreetMap”. A busca por nome (Photon) funcionou de forma estável.
- A cobertura depende do OSM: Araguatins tem poucas farmácias, mercados e igrejas cadastrados.
- O limite municipal usa polígono simplificado (~90 m); pontos muito próximos da divisa podem ser classificados com essa tolerância.
- O ponto do IFTO é a coordenada cadastral de referência, não necessariamente o portão.
- A duração usa o perfil de carro do OSRM também para moto.
- Geolocalização real só foi exercitada com GPS simulado no navegador (autorizado, negado, indisponível, timeout, fora do município); não houve teste em aparelho físico.
- Motoristas, placas (`DEMO-001/002`), avatares (iniciais) e a posição do veículo são fictícios e ilustrativos.

## Créditos

Mapas e locais © contribuidores do [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL). Ícones: Solar (480 Design, CC BY 4.0) e Phosphor (MIT) via [Iconify](https://iconify.design/).
