# PROMPT MESTRE — CRIE O SITE DEMONSTRATIVO BICOMOB

Claude, você será o **desenvolvedor e designer frontend** do site de demonstração **BicoMob**, um conceito de serviço de corridas de moto e carro pensado para **Araguatins, Tocantins**. Este projeto será exibido em uma APRESENTAÇÃO. **Você deve realmente construir o site**, não apenas explicar como seria ou gerar novos mockups.

O pacote contém este prompt, documentos de especificação e imagens de referência. Leia todos os arquivos `.md` e observe todas as imagens da pasta `referencias/` antes de implementar. Trabalhe diretamente na pasta atual do projeto e execute/teste o resultado.

## O QUE EU QUERO, SEM CONFUSÃO

**Não quero um aplicativo de celular instalado. NÃO quero um Android/iOS nativo. Não quero só imagens.** Quero um **site responsivo, interativo, que SIMULE um aplicativo com fidelidade de produto**.

- **Quando abrir em computador:** uma página com fundo preto/escuro e um **celular virtual de alta qualidade, centralizado**, contendo a interface funcional do BicoMob. Pode haver um discreto fundo decorativo, mas o protagonista é o celular. O usuário deve conseguir clicar e navegar dentro dele, rolar as telas e usar o mapa.
- **Quando abrir em celular:** retirar completamente a moldura e apresentar **a interface BicoMob ocupando 100% da tela**, como se fosse um aplicativo móvel comum; usar `100dvh`, safe areas e barra inferior adaptada.
- **Não escalar a UI com `transform: scale(...)`.** Use CSS responsivo de verdade para inputs, mapas, modais, navegação e toques.

## REFERÊNCIA: UBER, MAS COM MARCA PRÓPRIA

A experiência visual e a organização devem lembrar fortemente um aplicativo moderno de mobilidade, particularmente a interface do Uber mostrada no PNG `referencias/00_uber_referencia_usuario.png`: campo **“Para onde?”**, sugestões de serviço, destinos favoritos, cartões arredondados, seleção de veículo, mapa real, driver card e barra de navegação.

**Nome BicoMob** sempre grafado assim. Sua identidade visual é **preto/grafite + verde neon #7FFF00**, branco para texto principal, cinza para texto secundário. Faça uma marca BicoMob com ícone simples de carro em verde, original, podendo ser um símbolo SVG criado por você. Visual refinado, com ícones de qualidade, fotos/imagens de carros, bordas suaves, sombras sutis e espaçamento excelente. Evite visual de dashboard de empresa ou template SaaS, ele deve parecer aplicativo de corridas de verdade.

**Reconstruir em código as telas das cinco imagens seguintes:**
- `01_login_bicomob.png`
- `02_home_bicomob.png`
- `03_calculo_corrida.png`
- `04_motorista_aceitou.png`
- `05_perfil_configuracoes.png`

Essas telas têm estrutura e aspecto aprovados como direção criativa, mas **NÃO** são arquivos a posicionar sobre a tela. Recrie seus elementos DOM/SVG/componentes reais. Os mapas que aparecem dentro dos PNGs são desenhos; substitua por mapa REAL e dados de trajeto corretos.

## TECNOLOGIA

Preferência: React + Vite + TypeScript + Tailwind/CSS, ícones `lucide-react`, `react-leaflet` + `leaflet`, dados mockados em arquivo TS/JSON e `localStorage`. Não criar login, banco, driver API, gateway de pagamento, mapa fictício ou qualquer serviço de logística em produção. Se escolher alternativa, justifique apenas se houver vantagem funcional clara.

## PÁGINAS E FLUXOS QUE DEVEM FUNCIONAR

1. **Entrada / login fake:** logo BicoMob, chamada “Bem-vindo ao BicoMob”, destaque com carro e Araguatins, botão/bubble **Cliente**, ação **Entrar como Cliente**. Um clique abre a experiência. Sem email, senha ou OTP.
2. **Home no estilo app de corridas:** cabeçalho BicoMob; barra arredondada **Para onde?** e chip **Agora**; favoritos **Casa — Centro, Araguatins** e **IFTO Campus Araguatins**; sugestões Moto, Carro, Estudante e Mercado; cartões promocionais com carros / trajeto IFTO; tabs **Início / Serviços / Atividade / Conta**.
3. **Pesquisa de local:** tocar “Para onde?” abre tela de origem e destino, sugestões realmente selecionáveis, pesquisa textual restrita a Araguatins e entradas curadas. Tocar destino deve atualizar a rota e o orçamento. O campo de origem deve ser editável; default é o Centro. Seleção pelo mapa (clicar para escolher ponto) é desejável. Botão **Confirmar trajeto**.
4. **Mapa real de Araguatins:** exibir a cidade real com Leaflet e OpenStreetMap (ou equivalente legítimo), ruas reais, marcador de origem e destino, zoom, rota viária quando serviço de roteamento estiver disponível. O IFTO fica na zona rural do próprio município e deve continuar acessível. Não usar mapa de São Paulo, São Francisco ou cidade inventada. Não permitir que destinos de outros municípios entrem na demonstração.
5. **Orçamento / escolher corrida:** distância estimada em km, duração em min, duas opções clicáveis **Moto** e **Carro** com imagem adequada e valores em R$, observação de tarifa mínima e suplemento IFTO. Selecionar uma opção atualiza o CTA. Valores devem ser calculados pelas fórmulas do documento de tarifas, nunca colocados como uma string fixa em todos os trajetos.
6. **Simular pedido / aceite:** tocar **Solicitar corrida** mostra “Procurando motorista...” (2–4 segundos simulados) e então uma transição para **Motorista aceitou**, com microanimação e estado visível. Não fingir que existe integração real; pode manter um discreto selo “Demo” nas telas.
7. **Detalhes do motorista:** mostrar foto/avatar fictício, nome, nota, tipo de veículo, modelo, cor, placa de exemplo, valor, localização ilustrativa do carro e previsão de chegada. Botões **Ligar**, **Mensagem** e **Compartilhar** devem ter comportamento simulado explícito (ver documentos). Permitir **Simular chegada**, **Iniciar viagem**, **Finalizar viagem** e **Cancelar**.
8. **Atividade:** histórico de corridas realizadas na demo, com origem/destino, categoria, data, preço, status, detalhes e botão para repetir percurso. LocalStorage é suficiente.
9. **Conta:** perfil Cliente/Conta demo; endereços favoritos; pagamento *demonstrativo* (Pix, cartão, dinheiro — sem transação); notificações; segurança; ajuda; tema escuro; sair da demo. Cada item deve abrir tela/painel simples, mas útil; não criar menu morto.
10. **Serviços:** catálogo pequeno com Moto e Carro operantes; Estudante aciona preset de IFTO; Mercado, se exibido, é “Em breve” honesto. Nada que não funcione pode parecer uma operação real disponível.

## TARIFAS — O PREÇO TEM QUE MUDAR COM O TRAJETO

**Moto:** base R$ 3,00 + R$ 1,60 por km + R$ 0,15 por minuto; mínimo R$ 7,00.
**Carro:** base R$ 5,00 + R$ 3,20 por km + R$ 0,25 por minuto; mínimo R$ 13,00.
**IFTO:** Zona Especial com suplemento configurável e visível. Configuração inicial de demonstração sugerida: Moto + R$ 2,50; Carro + R$ 6,50, para aproximar os valores propostos na apresentação (em torno de R$ 15/R$ 30 num trajeto de aproximadamente 5 km). São valores de simulação, não tarifa real em funcionamento.

Exibir o detalhamento ao tocar no preço. `preco = max(minimo, base + km*valorKm + minutos*valorMin) + suplementoZona`. Em geral, arredonde só no resultado final para 2 casas. Os mockups podem conter `R$ 14,90/R$ 29,90` como **valores ilustrativos**, mas a implementação deve recalcular tudo de forma coerente.

## PRIORIDADE MÁXIMA: EXPERIÊNCIA VISUAL E DEMONSTRAÇÃO

Quero apresentar para alguém e a pessoa pensar: **“Isso já parece um aplicativo de corridas de verdade em Araguatins.”** Para isso, não deixe botões sem ação e não substitua mapa por desenho fake. Inclua animações leves, transições de telas, seleção verde, cartões de carro, um sheet para o motorista e navegação consistente. Evite exagero futurista e excesso de brilho: o BicoMob deve ser original, sofisticado, próximo do visual minimalista da referência.

## ENTREGA E EXECUÇÃO

Implemente os componentes, rode `npm install`, `npm run build` e testes aplicáveis, corrija problemas. Entregue a URL local e comandos para executar. Se possível, teste em viewport desktop e mobile e registre quais fluxos foram efetivamente verificados. Mostre limitações claras (por exemplo, roteamento remoto indisponível) sem trocar rotas reais por mapas inventados.

**NÃO me responda só com um plano: crie o projeto, execute e confira.** Evite perguntas de detalhe que já estão respondidas pelos anexos. Leia `06_CHECKLIST_E_CRITERIOS.md` para a definição de pronto.
