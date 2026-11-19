# Notas técnicas — BicoMob

Detalhes de funcionamento para quem desenvolve ou audita a demonstração. A apresentação do projeto está no [README](../README.md).

## Área geográfica

- O limite é o polígono real do município de Araguatins (TO), do OpenStreetMap, guardado em `src/data/municipio.json` (394 vértices).
- `src/lib/boundary.ts` expõe `insideArea(pos)`: teste ponto-em-polígono. A caixa (bbox) só serve para descarte rápido e limite de navegação do mapa.
- Validado em: resultados de busca, escolha no mapa, GPS, origem, destino e repetição de corridas antigas (que ficam como "Fora da área disponível").
- Os dados locais são regenerados com `npm run data` (`scripts/build-data.mjs`, consulta Nominatim e Overpass a partir do Node).

## Busca de endereços

1. **Índice local** (`src/data/places-index.json`, ruas, bairros e lugares nomeados): responde na hora, sem rede (`src/lib/localIndex.ts`).
2. **Photon** (autocomplete): consulta com bbox do município, viés de posição arredondado (~1 km), debounce, cancelamento, cache e tempo limite de 4,5 s. Resultados fora do polígono são descartados.
3. **Nominatim público**: nunca no autocomplete. Só na busca explícita (botão "Buscar endereço" ou Enter, mínimo 3 caracteres), com limite global de 1 req/s, cache de 30 min e deduplicação de requisições em andamento. Também usado na geocodificação reversa.
4. Se um serviço cair, o índice local continua respondendo e o usuário pode escolher o ponto no mapa.
5. `VITE_PHOTON_URL` permite apontar para uma instância própria do Photon.

## Rotas e tarifa

- Rota por OSRM; se indisponível, usa-se estimativa por linha reta (tracejada) e o aviso correspondente.
- Tarifa em `src/lib/fare.ts`. `priceOptions(sugerido, categoria)` gera a grade determinística de 9 valores de "Seu preço".

## Estado e armazenamento

- Estado em `src/store.tsx`. A categoria (Moto/Carro) começa vazia; só é escolhida depois da rota.
- `localStorage`: `bicomob:profile:v3`, `bicomob:rides:v3`, `bicomob:recents:v3` e `bicomob:theme:v3` (padrão claro, ignora a preferência do sistema). Chaves antigas são migradas/removidas.
- A posição do usuário fica só em memória.

## Interface

- Tema por tokens CSS: `:root` é claro, `:root[data-theme='dark']` é escuro; um script inline em `index.html` aplica o tema antes da renderização. Verde `#7FFF00` em preenchimentos e `#2F8F00` (claro) em textos/ícones.
- Ícones Iconify empacotados localmente (`src/icons`), sem consulta a CDN. `npm run icons` regenera o pacote.
- O mapa mantém a atribuição do OpenStreetMap; nomes de serviços técnicos não aparecem no texto da interface (`src/lib/project.test.ts` verifica).

## Limitações

- Serviços públicos podem ficar indisponíveis ou lentos; não há SLA.
- A cobertura do OpenStreetMap em Araguatins é limitada (cerca de 95 ruas e 112 lugares nomeados no índice local).
- O GPS foi testado apenas de forma simulada no navegador.
