# 06 — Checklist de aceite (entrega verificável)

## Requisitos obrigatórios

- [ ] `npm install` funciona; `npm run dev` abre o site e `npm run build` conclui sem erros.
- [ ] **Desktop:** interface renderiza dentro de um mockup de celular alinhado no centro da página; tudo é clicável dentro dele.
- [ ] **Celular:** o mockup externo não aparece; interface ocupa a tela com responsividade verdadeira.
- [ ] A página de entrada mostra **Cliente**, sem autenticação, e abrir a demo funciona.
- [ ] O visual usa `#7FFF00` com fundo escuro, marca BicoMob original, ícones consistentes e imagens de carro/moto.
- [ ] Home tem busca “Para onde?”, destinos salvos, serviços/sugestões e cartões promocionais.
- [ ] Pesquisar e selecionar lugares em Araguatins funciona (no mínimo os locais curados).
- [ ] Campo de origem pode mudar; opção de inverter origem e destino funciona.
- [ ] Mapa interativo renderiza dados cartográficos **de Araguatins**, não mapa simulado nem screenshot.
- [ ] IFTO Campus Araguatins é selecionável e visível no mapa apesar de zona rural.
- [ ] Nenhum resultado de destino de outro município é aceito.
- [ ] Rota viária é exibida quando há fonte real disponível; indisponibilidade é explicada, nunca encoberta por falsa rota.
- [ ] Distância/duração não são sempre fixas; mudanças no percurso recalculam estimativa.
- [ ] Fórmulas Moto/Carro, mínimo e taxa IFTO são implementadas e testadas; total é coerente no pedido e recibo.
- [ ] Escolher Moto/Carro altera seleção e preço; CTA solicita a categoria certa.
- [ ] Botão de solicitar produz estado **Procurando** e transição automática simulada para **Motorista aceitou**.
- [ ] Driver card mostra nome fictício, nota, modelo, cor, placa demonstrativa, ETA e preço.
- [ ] Ligar/Mensagem/Compartilhar têm comportamento de demo; não são botões mortos nem acionam contatos reais.
- [ ] Chegada, início e término de corrida funcionam com transição e botão de voltar/cancelar.
- [ ] A conclusão mostra recibo e registra corrida no histórico local.
- [ ] Tabs Início/Serviços/Atividade/Conta abrem páginas próprias, sem navegação quebrada.
- [ ] Em Conta, configurações básicas abrem telas/diálogos e “Sair da demo” funciona.
- [ ] Feedback de loading, erro e estado vazio foi implementado.
- [ ] Não há backend, login real, pagamento real ou compartilhamento de localização real.
- [ ] Atribuição do OpenStreetMap está visível no mapa.
- [ ] Não há credenciais ou API keys publicadas inadvertidamente.

## Testes de tarifa com valores conhecidos

- Moto, urbano 2 km/6 min => **R$ 7,10**.
- Carro, urbano 2 km/6 min => **R$ 13,00**.
- Moto, IFTO 5 km/10 min, suplemento inicial R$ 2,50 => **R$ 15,00**.
- Carro, IFTO 5 km/10 min, suplemento inicial R$ 6,50 => **R$ 30,00**.
- Preço não deve divergir entre card, confirmação, motorista e recibo.

## Testes de navegação em apresentação (executar manualmente)

**Cenário A — ida ao IFTO (carro):** entrar como Cliente → tocar IFTO salvo → ver mapa real de Araguatins → selecionar Carro → ver preço + decomposição → solicitar → estado de busca → motorista aceita → ver carro/placa/ETA → abrir Mensagem → fechar → simular chegada → iniciar → finalizar → ver recibo e atividade.

**Cenário B — corrida urbana (moto):** voltar para Início → escolher origem/destino locais em Araguatins → selecionar Moto → conferir alteração de preço/distância → solicitar → cancelar antes ou depois do aceite → atividade mostra status adequado.

**Cenário C — conta:** entrar na aba Conta → abrir perfil → abrir pagamentos → selecionar visualmente Pix/Dinheiro → conferir aviso de demo → favoritos → sair → retorna à página inicial.

## Testes de layout

Verificar: Chrome desktop 1366x768 e 1920x1080; mobile 320x680, 360x800, 390x844 e 430x932; ao menos um teste de teclado/foco; mapa com toques e zoom; bottom nav sem sobreposição de conteúdo; teclado virtual sem esconder CTA indispensável.

## O que não pode ocorrer

- Usar somente uma captura estática de um iPhone em vez de telas construídas.
- Exibir mapa inventado com linhas aleatórias como se fosse mapa real de Araguatins.
- Mostrar valores fixos de R$14,90/R$29,90 para todos os caminhos.
- Simular pagamento real, aceitar documento real, mandar SMS/WhatsApp, pedir telefone.
- Falhar silenciosamente quando API de tiles/rotas não responder.
- Deixar todos os botões como placeholders, “em construção”, com exceção de serviços explicitamente rotulados “Em breve”.

## Evidência de entrega esperada do Claude

1. Pasta do projeto com código funcional.
2. Comandos para rodar localmente e gerar build.
3. Capturas da versão desktop dentro do telefone + versão mobile sem moldura (se ferramentas de screenshot estiverem disponíveis).
4. Testes/validações executadas, com sucesso/falha de forma transparente.
5. Resumo curto das limitações externas (tiles/roteamento/geocoding) e de que é uma demonstração.
