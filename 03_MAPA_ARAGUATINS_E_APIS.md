# 03 — Mapa REAL de Araguatins e APIs de localização

## Condição fundamental

A experiência BicoMob deve usar dados cartográficos **reais** de **Araguatins, Tocantins, Brasil**. A rota até o IFTO está no **território municipal de Araguatins**, mas o campus fica em zona rural. "Apenas Araguatins" significa não aceitar destinos de outros municípios; **não** deve bloquear o campus por estar fora do núcleo urbano.

## Stack de baixo custo para a demo

- **Leaflet + React Leaflet**: interface interativa, markers, zoom, linha de rota, popups.
- **OpenStreetMap raster tiles**, com atribuição **© OpenStreetMap contributors** visível. Usar o endpoint oficial apenas dentro da política de uso (ou provedor licenciado alternativo com a devida atribuição).
- **Pontos de interesse locais**: lista pré-carregada e curada para resposta imediata, mais geocodificação opcional sob demanda.
- **Nominatim público** (opcional): apenas em pesquisas submetidas explicitamente pelo usuário, com cache, identificação adequada e máximo **1 req/s somando toda a aplicação**. **É proibido usar o serviço público para autocomplete a cada tecla.** Se crescer ou precisar sugestões online, contratar provedor apropriado ou hospedar solução.
- **Rota viária**: serviço de roteamento como OSRM, Valhalla ou openrouteservice **se configurado e disponível**, respeitando suas condições; não presumir disponibilidade/SLA de endpoints públicos de teste. Sem rota retornada, mostrar pins/linha indicativa tracejada e aviso **“Rota de demonstração — percurso viário indisponível”**, sem inventar um trajeto real por ruas.

## Coordenadas iniciais (referência aproximada; validar visualmente no mapa)

```ts
export const ARAGUATINS_CENTER = { lat: -5.6529, lng: -48.1162 }; // centro aproximado da cidade
export const IFTO_ARAGUATINS = { lat: -5.64520829, lng: -48.07150463 }; // referência de cadastro escolar (validar acesso/entrada)
```

Endereço oficial do campus: **Povoado Santa Teresa, Km 05, Zona Rural, CEP 77950-000, Araguatins — TO**. A localização do ponto cadastral pode não ser o portão de entrada ou o ponto exato de embarque; buscar OSM/entrada viária para melhorar o marcador e a rota, quando disponível.

Distância de apresentação Centro → IFTO: **cerca de 5 km**, conforme briefing do produto. **Não usar 5,0 km como distância universal fixa**: quando o roteador responder, usar distância e duração que ele retornou; a referência de 5 km pode ser usada como **cenário de demo documentado**, não como medição garantida do trajeto viário.

## Regras de restrição geográfica

1. Abrir mapa centrado em Araguatins com zoom que mostre a malha urbana; quando destino IFTO for escolhido, enquadrar os dois pontos (`fitBounds` com padding), dentro da área local.
2. Estabelecer `maxBounds` confortável em torno do perímetro de demonstração, incluindo o IFTO; não zoom out até outra cidade/região. `maxBounds` visual **não** é prova de fronteira municipal.
3. Filtrar resultados da busca por município `Araguatins` e UF `TO` quando a fonte oferecer dados de endereço. Para pontos manuais, adotar uma máscara/bounds razoável local e opcionalmente validar com limite municipal real (OSM administrative boundary), se viável.
4. Não listar Imperatriz/MA, Augustinópolis/TO, Palmas, Araguaína etc. como destinos da demo.
5. Se pesquisa não encontrar local em Araguatins: “Não encontramos esse local em Araguatins. Tente um endereço diferente ou escolha no mapa.”
6. Ao usar geolocalização, pedir consentimento de navegador; em caso de negação, iniciar no Centro sem erro.
7. Clique no mapa para seleção de ponto precisa de modo explícito (`Escolher ponto no mapa`), para evitar disparos acidentais ao navegar.

## Pesquisa recomendada (melhor UX em demo)

- Sem API key e sem backend: campo local faz **filtro instantâneo da lista curada** com `includes`/normalização de acento. É rápido e confiável.
- Para endereços adicionais, botão **“Buscar endereço em Araguatins”**, disparando uma requisição Nominatim após ENTER/click; não emitir várias requisições por digitação.
- Se resultado não possuir coordenadas/localidade confiáveis, pedir selecionar marcador manual ou local curado.

## Cálculo de rota

- Enviar `lng,lat` para endpoint de roteamento autorizado quando houver configuração. Decodificar geometria real; exibir polyline verde `#7FFF00` e markers contrastantes.
- Preferir `distance_m / 1000` e `duration_s / 60` do provedor. Mostrar distância com 1 casa decimal e tempo arredondado, sinalizados como estimativas.
- Para falha de rota: manter mapa real e pontos; mostrar ligação **tracejada, não como se fosse rota viária**, e "Distância estimada" calculada com distância em linha reta/heurística identificada como aproximação, ou desabilitar cotação precisa até rota voltar.
- Não fazer cálculo por coordenadas de San Francisco, não usar tile do mockup, não fazer GPS tracking de motoristas reais.
- Um marcador de veículo animado no modo motorista aceito é **animação de simulação**: não confundir com rastreamento GPS real.

## Notas de implementação

- Importar CSS do Leaflet corretamente e corrigir o ícone default do marcador em Vite.
- Revalidar o tamanho do Leaflet ao entrar na tela, ao mudar de viewport e quando o shell aparecer.
- Manter a atribuição OSM acima de painéis ou movê-la para uma área ainda visível.
- Se o acesso à rede estiver indisponível, avisar claramente; não substituir por um desenho fictício que finja ser um mapa real. Para uma apresentação offline, oferecer build preparado e documentar que tiles dependem de conexão (ou usar dados offline licenciados somente quando permitido).

## Fontes e políticas

- OpenStreetMap Tile Usage Policy: https://operations.osmfoundation.org/policies/tiles/
- Nominatim Usage Policy: https://operations.osmfoundation.org/policies/nominatim/
- OpenStreetMap: https://www.openstreetmap.org/
- Leaflet: https://leafletjs.com/
- React Leaflet: https://react-leaflet.js.org/
- IFTO, página institucional: https://ifto.edu.br/araguatins/acesso-a-informacao-araguatins/institucional/institucional/
- Coordenada aproximada campus (terceiro, conferir no mapa): https://www.escolasnobrasil.com/norte/ifto-campus-araguatins-araguatins
