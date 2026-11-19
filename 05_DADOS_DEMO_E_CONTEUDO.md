# 05 — Seeds locais e textos da demonstração

Toda pessoa, veículo, placa, localização do motorista, status e previsão de chegada nesta etapa devem ser tratados como **dados fictícios de apresentação**. Não vincular a identidade real de motoristas ou usuários.

## Identidade da conta

```ts
const clientDemo = {
  id: 'cliente-demo',
  name: 'Cliente',
  city: 'Araguatins',
  state: 'TO',
  isDemo: true,
  paymentPreference: 'dinheiro',
};
```

O usuário pode alterar o nome visual da conta e escolher forma de pagamento visual, se fácil de implementar. Nada será cobrado.

## Locais base

```ts
const PLACES = [
  {
    id: 'centro',
    title: 'Centro de Araguatins',
    subtitle: 'Centro, Araguatins - TO',
    position: [-5.6529, -48.1162],
    icon: 'house',
    tag: 'Centro aproximado; escolher ponto exato quando solicitado'
  },
  {
    id: 'ifto-araguatins',
    title: 'IFTO Campus Araguatins',
    subtitle: 'Povoado Santa Teresa, Km 05, Zona Rural, Araguatins - TO',
    position: [-5.64520829, -48.07150463],
    icon: 'graduation-cap',
    tag: 'Referência cadastral; validar entrada viária no mapa'
  }
];
```

- **Casa** é um **alias de demonstração** para o ponto central; não atribuir residência real do usuário a um endereço público.
- Para criar mais lugares (hospital, praça, comércio etc.), validar nome e coordenadas com dados locais reais antes de incluir.
- Não adicionar pontos em Imperatriz, São Francisco, Palmas, São Paulo ou outras cidades.

## Motoristas mockados

```ts
const DRIVERS = {
  carro: {
    id: 'driver-demo-carro',
    name: 'João Santos',
    rating: 4.9,
    vehicle: 'Fiat Argo',
    color: 'Branco',
    plate: 'DEMO-001', // código meramente ilustrativo, não é uma placa brasileira real
    etaMin: 4,
    avatar: 'avatar ilustrativo, nunca foto de pessoa real sem direito de uso',
  },
  moto: {
    id: 'driver-demo-moto',
    name: 'Lucas Almeida',
    rating: 4.8,
    vehicle: 'Honda CG 160',
    color: 'Preta',
    plate: 'DEMO-002', // mesmo princípio de fictício
    etaMin: 3,
    avatar: 'avatar ilustrativo',
  }
};
```

As imagens têm carro Fiat Argo e uma placa com aparência brasileira (`QWE2A34`) por referência estética. **No site funcional prefira usar identificador `DEMO-001`/`DEMO-002`, com selo visível “Simulação”, para não corresponder a uma placa real.** Alternativamente, exibir "Placa demonstrativa" com um padrão explicitamente impossível.

## Textos por etapa

| Estado | Cabeçalho | CTA/Ação |
|---|---|---|
| Boas-vindas | Bem-vindo ao BicoMob | Entrar como Cliente |
| Home | Para onde? | Escolher destino |
| Busca | Aonde você quer ir? | Confirmar trajeto |
| Preço | Escolha sua viagem | Solicitar Moto / Solicitar Carro |
| Procurando | Procurando motorista... | Cancelar solicitação |
| Aceita | Seu motorista está a caminho | Simular chegada |
| Chegou | Seu motorista chegou | Iniciar viagem |
| Em corrida | Sua viagem está em andamento | Finalizar viagem |
| Finalizada | Viagem concluída! | Voltar ao início |
| Cancelada | Solicitação cancelada | Voltar ao início |

## Mensagem simulada do motorista

- Driver: “Olá! Estou a caminho do local de partida. (Mensagem simulada)”
- Cliente quick reply: “Estou no local combinado.”
- Driver resposta automática: “Perfeito! (Simulação)”

Sem SMS real, WhatsApp, geolocalização de terceiros ou chamadas telefônicas.

## Pagamento visual

- Dinheiro: “O pagamento seria feito ao motorista — esta é apenas uma simulação.”
- Pix: “Pix indisponível nesta demonstração: nenhuma cobrança será realizada.”
- Cartão: “Cartões não são armazenados nem cobrados nesta demonstração.”
- Não solicitar dados de cartão, CPF, telefone, PIX real ou outras informações pessoais.

## Conteúdo da home

- Título dos favoritos: “Seus destinos” ou linhas Casa / IFTO.
- Tiles: Moto, Carro, Estudante, Mercado (Em breve).
- Promo 1: “Ir para o IFTO” → “Economize na ida ao campus” (a afirmação é proposta da marca, não garantia universal).
- Promo 2: “Carro na cidade” → “Conforto para você e sua família”.
- Rodapé discreto no perfil: “BicoMob • Projeto demonstrativo • Araguatins/TO”.

## Histórico inicial

Preferir histórico inicialmente vazio, para ficar evidente que a apresentação foi interativa. Ao concluir a primeira corrida, salvar e renderizar imediatamente. Se quiser mostrar o layout no primeiro contato, pode criar dados seed **claramente rotulados como “Viagens de exemplo”**, sem fingir que usuário realizou corridas.
