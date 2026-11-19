# BicoMob — site demonstrativo (Araguatins, TO)

Site responsivo que **simula** um app de corridas de moto e carro. É uma demonstração: não há motoristas reais, login, pagamento, backend nem rastreamento. (O briefing original do pacote está em `PACOTE_README.md`.)

- **Desktop:** o app aparece dentro de um celular virtual centralizado (rolagem interna).
- **Celular (≤ 600 px):** sem moldura, interface em 100% da tela (`100dvh`, safe areas).

## Como executar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção em dist/
npm run preview    # serve o build
npm test           # testes de tarifa e restrições geográficas
```

## Stack

React 18 + TypeScript + Vite, CSS próprio, `lucide-react`, Leaflet + React Leaflet, `localStorage`/`sessionStorage`.

## O que existe

Boas-vindas (Cliente) → Início (Para onde?, favoritos, sugestões, promoções) → busca de origem/destino (locais curados, busca de endereço, ponto no mapa, inverter) → mapa + rota + Moto/Carro + detalhamento de preço → procurando motorista (2–4 s) → motorista (Ligar / Mensagem / Compartilhar simulados) → simular chegada / iniciar / finalizar / cancelar → recibo e avaliação local → Atividade (detalhes, repetir viagem) → Serviços (Mercado = “Em breve”) → Conta (perfil, favoritos, pagamento demonstrativo, notificações, segurança, ajuda, tema, limpar dados, sair).

## Tarifas (simulação)

`preço = max(mínimo, base + km × R$/km + min × R$/min) + suplemento IFTO` — constantes em `src/lib/fare.ts`.
Moto: 3,00 + 1,60/km + 0,15/min, mín. 7,00, IFTO +2,50. Carro: 5,00 + 3,20/km + 0,25/min, mín. 13,00, IFTO +6,50.
O suplemento é aplicado uma vez quando origem **ou** destino está na zona IFTO (id curado ou raio de 500 m). O preço calculado na escolha é o mesmo do pedido, do motorista e do recibo.

## Mapa e serviços externos

- Tiles: OpenStreetMap (atribuição visível). Exibidos com filtro CSS escuro; os dados continuam sendo os do OSM.
- Rota viária: OSRM público de demonstração (`router.project-osrm.org`, sem SLA). Se falhar, o mapa real continua, a linha vira **tracejada** com o aviso “Rota de demonstração — percurso viário indisponível” e a distância é uma estimativa em linha reta × 1,3.
- Busca de endereço: Nominatim público, **somente ao clicar em “Buscar endereço”** (no máximo 1 req/s, com cache), filtrando município Araguatins/TO. Sem autocomplete a cada tecla.
- Ponto no mapa: validado por limites aproximados e, havendo rede, por geocodificação reversa (rejeita outros municípios).
- Sem rede: os tiles não carregam e a busca/rota remota avisa a indisponibilidade; não há mapa desenhado no lugar.

## Limitações

- Os limites geográficos são uma caixa aproximada, não a fronteira municipal oficial.
- O ponto do IFTO é a coordenada cadastral de referência, não necessariamente o portão.
- Locais curados: Centro, IFTO, Hospital Municipal e Praça Ancelmo Ferreira Guimarães (coordenadas conferidas no OSM). Outros destinos via busca ou mapa.
- A duração usa o perfil de carro do OSRM também para moto.
- Motoristas, placas (`DEMO-001/002`), avatares (iniciais) e a posição do veículo são ilustrativos. Veículos e fotos são ilustrações SVG próprias; nenhuma imagem de terceiros é usada.
