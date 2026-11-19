# CLAUDE.md — Instruções obrigatórias do projeto BicoMob

Você é o agente de desenvolvimento responsável por **implementar e testar** um site DEMO interativo chamado **BicoMob**.

## Leia antes de codificar

Leia integralmente, nessa ordem: `00_PROMPT_PARA_COLAR_NO_CLAUDE.md`, `01_PRODUTO_E_FLUXO.md`, `02_DESIGN_E_RESPONSIVIDADE.md`, `03_MAPA_ARAGUATINS_E_APIS.md`, `04_TARIFAS_E_SIMULACAO.md`, `05_DADOS_DEMO_E_CONTEUDO.md`, `06_CHECKLIST_E_CRITERIOS.md`, `07_FONTES_E_REFERENCIAS.md`. Inspecione as imagens em `referencias/`.

## Regras invioláveis

1. Construir **SITE WEB / PWA-like**, não APK, app nativo nem protótipo estático sem interações.
2. **Desktop:** site exibido DENTRO de um telefone centralizado em página escura. **Mobile real:** layout ocupa a viewport normalmente, SEM moldura de celular.
3. Cores: fundo preto/grafite e verde principal exatamente `#7FFF00`.
4. Inspiração visual e hierarquia de produtos de mobilidade como o Uber, porém **branding BicoMob original** (não copiar logotipo, nome, ilustrações proprietárias ou identidade de marca do Uber).
5. Mapa **de verdade** mostrando Araguatins-TO, incluindo o IFTO no território do município; **não** inventar mapa, polilinha de ruas ou mapa de cidade genérica. A visualização de mapa deve respeitar atribuições de licença.
6. Busca de lugares e escolha da origem/destino; seleção Moto/Carro; preço calculado; solicitar corrida; motorista fictício aceitar; visualização de perfil, veículo, placa, ETA; acompanhar e finalizar corrida; histórico e conta demo.
7. **Não usar nenhuma autenticação, banco, API paga, pagamentos reais ou prestador de corridas real.** Nenhum dado pessoal real ou falsa promessa de veículo disponível. Não acionar chamadas/WhatsApp reais na demo.
8. As telas PNG são **referências visuais**: reconstruir todo texto, cartão, botão, mapa, ícone, navegação e estados como HTML/React interativos; não usar a imagem inteira como plano de fundo clicável.
9. Priorizar uma implementação utilizável, bonita e estável; não adicionar funções complexas que atrasem a demo.
10. Em caso de divergência entre a imagem e a regra escrita, **a regra escrita prevalece**, sobretudo preço, mapa, tipografia, acessibilidade, funcionamento e veracidade.
11. Não pedir decisões adicionais sobre detalhes triviais; use os padrões documentados. Apresente o resultado executado e testado, indicando limitações factuais.

## Stack preferencial

React + TypeScript + Vite; Tailwind CSS ou CSS modular; `lucide-react`; Leaflet + React Leaflet; roteamento simples em estado ou React Router; persistência localStorage. Sem Supabase e sem backend para esse MVP.

## Entrega esperada

Código-fonte completo na pasta de implementação, `README.md` com `npm install` e `npm run dev`, build sem erro, navegação demo funcional, mapa ao menos com tiles OSM reais (se rede disponível), fallback honesto quando serviços externos estiverem indisponíveis, e teste real da versão desktop e mobile.
