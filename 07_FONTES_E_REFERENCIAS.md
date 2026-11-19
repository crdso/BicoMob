# 07 — Pesquisa, referências e licenças

## Design/fluxo do Uber — referência de experiência, não de marca

Pesquisa realizada para orientar os fluxos BicoMob. A Uber descreve seleção de destino, visualização de categorias, confirmação do embarque, busca por parceiro, ETA e dados do motorista. A versão redesenhada enfatiza favoritos, serviços e atividade. **Use como base de UX; não replique marca/logotipo ou elementos protegidos diretamente.**

- Uber oficial: interface redesenhada (referência de hierarquia da home, favoritos, serviços, atividade): https://www.uber.com/gb/en/u/redesigned-uber-app/
- Ajuda Uber: como solicitar viagem, seleção de veículo, busca e ETA: https://help.uber.com/pt-BR/riders/article/how-to-request-a-ride-?nodeId=67f41961-e0aa-4670-af32-58be02c7c492
- Ajuda Uber: identificação do motorista e veículo: https://help.uber.com/pt-BR/riders/article/como-identificar-o-motorista-e-o-ve%C3%83%C2%ADculo?nodeId=02746faf-1bc6-4d3f-8ba2-ab35f36d7191
- Uber Brasil: visão geral do serviço: https://www.uber.com/br/pt-br/ride/how-it-works/

## Araguatins / IFTO

- OpenStreetMap Wiki, Araguatins: https://wiki.openstreetmap.org/wiki/Araguatins
- IFTO Campus Araguatins — fonte institucional, endereço rural: https://ifto.edu.br/araguatins/acesso-a-informacao-araguatins/institucional/institucional/
- Localização de referência do campus em cadastro escolar de terceiro (não é validação do portão exato): https://www.escolasnobrasil.com/norte/ifto-campus-araguatins-araguatins

## Mapas e termos de uso

- Leaflet: https://leafletjs.com/
- React Leaflet: https://react-leaflet.js.org/
- OpenStreetMap: https://www.openstreetmap.org/
- Política de uso de tiles oficiais: https://operations.osmfoundation.org/policies/tiles/
- Política de uso do Nominatim público: https://operations.osmfoundation.org/policies/nominatim/

**Resumo prático:** atribuição `© OpenStreetMap contributors` visível; não raspar tiles nem fazer pré-download; não fazer autocomplete usando Nominatim público; no máximo 1 requisição/segundo no Nominatim público agregada para a aplicação; identificar app e usar cache. Evitar usar APIs públicas de demonstração como se tivessem disponibilidade garantida para produção.

## Imagens incluídas (`referencias/`)

| Imagem | Papel |
|---|---|
| `00_uber_referencia_usuario.png` | Referência enviada pelo idealizador: home do Uber |
| `01_login_bicomob.png` | Mockup gerado para tela de boas-vindas/login fake |
| `02_home_bicomob.png` | Mockup gerado para home BicoMob com destinos e categorias |
| `03_calculo_corrida.png` | Mockup gerado de trajeto, opções de transporte e tarifa |
| `04_motorista_aceitou.png` | Mockup gerado de status do motorista e driver card |
| `05_perfil_configuracoes.png` | Mockup gerado de conta, favoritos e configurações |

**Licença / uso no projeto:** as imagens geradas para a proposta podem orientar a criação da interface. O screenshot do Uber é **apenas referência privada de design**, não deve ser redistribuído como logo/arte proprietária do site. Fontes de fotografias externas de carros devem ter licenças verificadas e registradas pelo implementador.

**Cuidado:** os mockups gerados por IA contêm ilustrações de rotas, fachadas, veículos e pessoas, e **não comprovam que a cena corresponde a Araguatins**. O site deve usar mapas reais e dados fictícios marcados como demonstração. Nenhuma foto de motorista pode ser apresentada como pessoa que trabalha para o BicoMob.
