# CLAUDE.md — BicoMob

BicoMob é uma **demonstração interativa** de um aplicativo de mobilidade urbana, inspirada na experiência de apps como o Uber, com identidade própria. **Não é um serviço real de transporte.**

## Regras do projeto

1. **Só demo:** sem motoristas, pagamentos, cadastro ou backend de corridas reais. Tudo que simula uma operação (motorista, placa, aceite, chegada, pagamento) deve ser claramente identificado como demonstração.
2. **Genérico:** nenhuma cidade, região, coordenada, limite geográfico ou taxa regional no código, nos dados, nos testes ou na documentação (`src/lib/project.test.ts` verifica isso).
3. **Dados geográficos reais:** mapa e busca usam OpenStreetMap (Leaflet, Photon, Nominatim, OSRM). Nunca inventar lugares, ruas ou coordenadas. Se um serviço público cair, informar e manter a opção de escolher o ponto no mapa. **Autocomplete = só Photon; o Nominatim público nunca é chamado automaticamente** (apenas busca explícita por ação do usuário e geocodificação reversa, com limite global de 1 req/s e cache).
4. **Localização:** `navigator.geolocation` só com permissão; nunca assumir a posição do usuário. A posição fica em memória; só sai do navegador arredondada (~1 km) como viés do Photon e na geocodificação reversa do Nominatim.
5. **Visual:** modo escuro, verde `#7FFF00`, ícones Iconify (`iconify-icon`), veículos como ilustrações SVG próprias, moldura de celular no desktop (430×900) e tela cheia no celular real (≤ 600 px).
6. **Título da aba:** exatamente `BicoMob`.
7. **Qualidade:** `npm run build` (inclui typecheck) e `npm test` devem passar antes de qualquer commit. Testar também no navegador, em desktop e mobile.

## Comandos

`npm install` · `npm run dev` · `npm run build` · `npm test` · `npm run icons`

## Stack

React 18 + TypeScript + Vite, CSS próprio, Leaflet/React Leaflet, iconify-icon, localStorage/sessionStorage. Sem backend.
