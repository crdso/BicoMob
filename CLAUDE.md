# CLAUDE.md — BicoMob

BicoMob é uma **demonstração interativa** de um aplicativo de mobilidade urbana, com identidade própria. **Não é um serviço real de transporte.**

## Regras do projeto

1. **Só demo:** sem motoristas, pagamentos, cadastro ou backend de corridas reais. Tudo que simula uma operação (motorista, placa, aceite, chegada, pagamento) deve ser identificado como demonstração.
2. **Somente Araguatins (TO):** origem, destino, pontos do mapa, resultados de busca e GPS são validados pelo polígono real do município (`src/lib/boundary.ts`, `insideArea`). Nunca aceitar só a bbox. Nunca listar lugares de outras cidades. GPS fora da área: mensagem `MSG_GPS_OUTSIDE`, origem vazia.
3. **Dados geográficos reais:** nunca inventar lugares, ruas ou coordenadas. Índice local (`npm run data`) + autocomplete Photon; **Nominatim público nunca é chamado automaticamente** (só busca explícita e geocodificação reversa, 1 req/s, cache). Se um serviço cair, informar e manter a escolha pelo mapa.
4. **Fluxo:** nenhuma escolha Moto/Carro antes do destino. Depois da rota: BicoMob Moto, BicoMob Carro ou "Seu preço"; nada pré-selecionado e o botão Solicitar só habilita após a escolha.
5. **Localização:** `navigator.geolocation` só com permissão; nunca assumir a posição. Só sai do navegador arredondada (~1 km).
6. **Visual:** tema claro por padrão (escuro opcional pelo botão sol/lua no cabeçalho; tema em `bicomob:theme:v3`), verde `#7FFF00`, ícones Iconify, moldura de celular no desktop e tela cheia em ≤ 600 px. Sem nomes técnicos de serviços no texto da interface; a atribuição do OpenStreetMap no mapa é obrigatória e não pode ser escondida.
7. **Título da aba:** exatamente `BicoMob`.
8. **Qualidade:** `npm run build` (inclui typecheck) e `npm test` devem passar antes de qualquer commit. Testar também no navegador (320–430 px e desktop).

## Comandos

`npm install` · `npm run dev` · `npm run build` · `npm test` · `npm run icons` · `npm run data`

## Stack

React 18 + TypeScript + Vite, CSS próprio, Leaflet/React Leaflet, iconify-icon, localStorage. Sem backend. Detalhes em `docs/TECNICO.md`.
