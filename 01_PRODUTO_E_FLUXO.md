# 01 — Produto, jornada e navegação

## Posicionamento

**BicoMob**: conceito de mobilidade por moto e carro pensado para **Araguatins — TO**, com preços acessíveis e experiência transparente. **Este projeto é exclusivamente uma demonstração visual/funcional para apresentação.** Não há operação real, motoristas reais, autenticação nem pagamentos.

## Mapa da navegação

```text
Boas-vindas
  └─ Cliente → Início
      ├─ Para onde? → Escolher origem/destino → Confirmar trajeto
      │   └─ Mapa + categorias/preços → Solicitar corrida
      │       └─ Procurando motorista → Motorista aceitou
      │           ├─ Mostrar chegada → Iniciar viagem → Concluir corrida → Recibo/avaliação
      │           └─ Cancelar simulação
      ├─ Serviços → Moto | Carro | Estudante (IFTO) | Mercado (em breve)
      ├─ Atividade → Histórico → Detalhes → Repetir viagem
      └─ Conta → Perfil | Favoritos | Pagamento | Notificações | Segurança | Ajuda | Sair
```

## 1. Boas-vindas / login fake

- Brand BicoMob com símbolo de carro.
- Título “Bem-vindo ao BicoMob”; subtítulo “Mobilidade para Araguatins”.
- Hero visual elegante com carro, tema Araguatins (sem usar screenshot inteira da referência).
- Um único perfil: **Cliente**. Bubble/linha selecionada, CTA **Entrar como Cliente**.
- Login instantâneo; preferir `sessionStorage` para manter a sessão durante a apresentação; ao sair, voltar às boas-vindas.
- Pequena nota “Experiência demonstrativa. Sem corridas reais”.

## 2. Início

- Topo enxuto: logo BicoMob, título da seção.
- Search “Para onde?”; “Agora” abre um pequeno selector que mantém “Agora” para o MVP; se “Agendar” for exibido, sinalizar “Em breve” sem prometer reserva real.
- Favoritos: Casa — Centro, Araguatins; IFTO Campus Araguatins — Povoado Santa Teresa, km 05, Zona Rural.
- Sugestões em tiles com ícones/miniaturas Moto, Carro, Estudante, Mercado.
- 2 cards promocionais com foto/arte de carro, por exemplo “Ir para o IFTO” e “Carro na cidade”. Ambos clicáveis e acionam um fluxo demonstrável.
- Barra inferior sempre visível: Início, Serviços, Atividade, Conta; active em verde #7FFF00.
- Mesmo no desktop dentro do mockup, a rolagem ocorre **dentro da tela do celular**, não em toda a página.

## 3. Buscar percurso

- Tela de “Escolher destino” com campos “Local de partida” e “Para onde?”.
- O pickup inicia em Centro de Araguatins, mas pode ser modificado.
- Preencher endereço por seleção de local curado ou pesquisa de local em Araguatins (consulte `03_MAPA_ARAGUATINS_E_APIS.md`).
- Mostrar resultados como nome, bairro/descrição e ícone pin; não exibir cidades vizinhas.
- Recomendações: IFTO, Centro, Casa e lugares efetivamente identificados no mapa; se não forem validados, não invente nome/endereço.
- Se o destino for igual à origem, impedir pedido e dar feedback.
- Se não houver coordenadas para o endereço, não calcular tarifa fictícia: pedir selecionar outro local ou ponto no mapa.
- Mostrar o percurso em mapa ao confirmar; permitir inverter origem/destino.

## 4. Confirmação e tarifa

- Cabeçalho “Confirmar trajeto”; origem e destino; painel de mapa real.
- Linha rota verde + pins distintos, legenda km/min, horário de chegada como estimativa (se possível).
- “Escolha sua viagem” com 2 cards Moto e Carro: foto/ilustração, tempo estimado, preço, seleção visual e CTA “Solicitar Moto”/“Solicitar Carro”.
- Price detail num pequeno sheet com base + km + minutos + suplemento (se aplicável).
- Estado de carregamento e erro de rota elegante.

## 5. Busca de motorista e aceite

- Após clicar solicitar: overlay/bottom sheet “Procurando motorista...” com pontos pulsantes e botão “Cancelar solicitação”. Simular transição com timeout curto (2–4 segundos) e limpar timeout na desmontagem.
- Em seguida apresentar motorista fictício; foto opcional (usar avatar illustration ou retrato claramente ficcional), nota, veículo, placa simulada, preço aprovado.
- ETA inicial exemplo 4 min (é **simulado**, não localização em tempo real). Carro/moto podem ser representados por marcador animado simples no mapa, com indicação de simulação.
- Botões: **Ligar** abre aviso “Chamadas indisponíveis nesta demonstração”; **Mensagem** abre chat fake com 2 mensagens prontas; **Compartilhar** copia um resumo textual marcado como simulação, sem URL de rastreamento real.
- Ações de progressão: “Simular chegada”, “Iniciar viagem”, “Finalizar viagem”. Mudar nome do estado, instrutivos e ícone no mapa.
- **Cancelar** abre confirmação e salva status cancelado somente na demo.

## 6. Conclusão

- Ao finalizar: tela “Viagem concluída!”, valor, origem, destino, categoria, quilômetros e data/hora, aviso “Pagamento simulado”, estrelas de avaliação local (não envia avaliação real).
- Botões “Voltar ao início” e “Ver atividade”. Registrar corrida no localStorage.

## 7. Atividade

- Lista de viagens de demonstração, com linha de separação limpa, ícone Moto/Carro, local de partida, destino, data, valor, badge status “Concluída”/“Cancelada”.
- Detalhes e “Repetir viagem” preenchem o percurso e abrem orçamento.
- Estado vazio com texto apropriado “Suas viagens vão aparecer aqui”.

## 8. Serviços

- **Moto** e **Carro** levam ao fluxo de corrida com categoria pré-selecionada.
- **Estudante** abre destino IFTO, sem inventar desconto de estudante que não está no modelo de preços.
- **Mercado** é apenas “Em breve”; não fingir entregas operacionais. Se quiser reduzir o escopo, substitua por um tile informativo.

## 9. Conta/configurações

- Perfil “Cliente” e badge “Conta demo”; ajustar nome de exibição opcionalmente, salvo no navegador.
- Endereços salvos: listar/editar com ponto selecionado, incluindo “Casa” e “IFTO”.
- Pagamento: escolha de apresentação “Dinheiro”, “Pix” e “Cartão”; **nenhum valor é cobrado**.
- Notificações: toggle visual salvo localmente; Segurança: explicação de compartilhamento e instruções gerais fictícias, sem alegar recursos reais; Ajuda: FAQ curto de como funciona a demo.
- “Modo escuro” aparece habilitado; alternância para claro é opcional, mas, se for um switch interativo, deve funcionar; caso contrário mostrar apenas status “Tema escuro”.
- Sair: encerra login fake, mantendo histórico local, com opção de limpar dados da demonstração.

## Regras UX gerais

- Botão de voltar sempre visível fora das tabs principais; jamais prender o usuário em um fluxo.
- Estados de loading, vazio, erro e sucesso personalizados.
- Toques com área mínima confortável (ideal >=44 CSS px).
- Acessibilidade: textos legíveis, foco de teclado, `aria-label` em ícones, contraste coerente.
- Nenhum link externo, e-mail ou telefone real sem necessidade. Nada de blocos placeholders/`TODO` visíveis na apresentação.
