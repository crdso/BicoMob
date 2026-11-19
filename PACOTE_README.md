# BicoMob — pacote de construção para Claude

**Objetivo:** entregar ao Claude Code um briefing completo para CONSTRUIR um **site demonstrativo interativo** (não aplicativo Android/iOS, não sistema de transporte real) da marca fictícia **BicoMob**, voltada para **Araguatins — TO**.

**NÃO há código do site neste ZIP:** há instruções em Markdown e seis referências visuais PNG (cinco telas BicoMob geradas para a ideia e uma imagem de Uber enviada pelo solicitante).

## Como utilizar

1. Descompacte este ZIP em uma pasta de trabalho do Claude (preferencialmente uma pasta vazia).
2. Abra essa pasta no Claude Code/IDE, mantendo os `.md` e a pasta `referencias/` acessíveis.
3. Envie ao Claude o conteúdo de `00_PROMPT_PARA_COLAR_NO_CLAUDE.md` (ou peça que o leia e execute). O `CLAUDE.md` contém as regras sempre válidas do projeto.
4. Peça para ele **executar a implementação**, instalar dependências, iniciar o site, verificar os fluxos e entregar os comandos para abrir a demo.
5. Quando o site ficar pronto, a visualização no computador deverá ter uma **moldura de celular centralizada**. Ao abrir em um celular real, deverá aparecer a **interface em tela cheia**, sem moldura.

## Arquivos

| Arquivo | Assunto |
|---|---|
| `CLAUDE.md` | Instruções permanentes para o agente de programação |
| `00_PROMPT_PARA_COLAR_NO_CLAUDE.md` | Prompt mestre, pronto para colar |
| `01_PRODUTO_E_FLUXO.md` | Escopo, telas, ações e navegação |
| `02_DESIGN_E_RESPONSIVIDADE.md` | Identidade visual, cores, shell de celular |
| `03_MAPA_ARAGUATINS_E_APIS.md` | Mapa real, pesquisa, rotas e limites geográficos |
| `04_TARIFAS_E_SIMULACAO.md` | Fórmulas de moto/carro e regras de preço |
| `05_DADOS_DEMO_E_CONTEUDO.md` | Pessoas, lugares, corridas e textos fictícios |
| `06_CHECKLIST_E_CRITERIOS.md` | Testes e definição de pronto |
| `07_FONTES_E_REFERENCIAS.md` | Pesquisas, créditos de mapa e uso das imagens |
| `referencias/*.png` | Mockups visuais e imagem original de referência |

## Duas distinções importantes

- As **cinco telas BicoMob são imagens de referência**, não páginas a serem exibidas como um PNG estático. O Claude deve recriar cada interface em componentes interativos.
- Os mapas desenhados nos mockups são **ilustrativos** e não comprovam ruas, traçados ou distâncias reais. O site precisa buscar um mapa cartográfico real de Araguatins. A cotação exibida nas imagens é ilustrativa; o cálculo implementado deve obedecer às fórmulas de tarifa.

**Identidade:** BicoMob, tema escuro, verde principal `#7FFF00`. Interface e conteúdo em português brasileiro. Demo sem cadastro, sem cobranças e sem motoristas reais.
