# Revisão de fidelidade ao Figma

Referência: cópia [Frontend Challenge](https://www.figma.com/design/4Ua6Jy9VzOmc2sITGli3lW/Frontend-Challenge--Copy-). Revisão em 03/11/2026, usando os contextos e screenshots dos 15 frames. Comparação manual em 1440 px e 414 px, com verificação funcional adicional em 390 px e tablet de 768 px.

## Cobertura

| Tela | Frame desktop | Frame mobile | Ajustes |
| --- | --- | --- | --- |
| Início | 2:2 | 14:5226 | Escala rem, tipografia, navegação ativa, hero, espaçamento de cards, paginação, editorial e rodapé |
| Detalhe | 10:244 | 15:5536 | Arte, painel sobreposto, badge de avaliação, edições e barra fixa de compra mobile |
| Carrinho | 11:1278 | 16:360 | Cabeçalho mobile, linhas com arte de 100 px, quantidade, cupom e resumo arredondado |
| Pagamento | 11:2862 | 16:748 | Carteiras, provedores, resumo e CTA mobile; dados do perfil recolhíveis |
| Confirmação | 11:4385 | Adaptação | SVG original, painel central, faixa de metadados e colunas do recibo |
| Login | 9:115 | 16:1022 | Diálogo desktop, composição mobile, campos, olho de senha e provedores sociais |
| Cadastro | 9:1022 | 16:1228 | Composição correspondente ao login e confirmação de senha independente |
| Perfil | 9:1238 | Adaptação | Campos, controles de senha, espaçamento e navegação lateral |
| Carteiras | 9:1670 | Adaptação | Formulário e navegação consistentes com perfil |

## Correções transversais

- Base rem de 16 px, preservando texto de corpo em 14 px. Isso corrige a escala dos componentes com utilitários rem.
- Seletor global de inputs com :where, permitindo que bordas, raio e dimensões de cada tela prevaleçam.
- Herança da família tipográfica sem apagar o peso definido pelos componentes Button.
- SVGs originais para fundo mobile, redes sociais, provedores de login e confirmação. Os fragmentos do símbolo Google conservam seus tamanhos e posições do export.
- Navegação e rodapé ajustados para a composição de cada rota; botões de retorno nas telas mobile do fluxo de compra.
- Lista semântica de valores corrigida, labels acessíveis preservadas e senha com exibição independente por campo.
- Hierarquia de títulos do detalhe corrigida para leitores de tela. Em telas estreitas, o título e a seleção de carteira do checkout respeitam o espaço do botão de voltar; o painel Cenários fica fora da área de totais e compra.

## Diferenças deliberadas e limites

A interface aproxima dimensões, hierarquia e composição dos frames; não é uma equivalência pixel a pixel. O catálogo usa dados consistentes da API simulada: nomes, contagens, disponibilidade, seleção de edições e totais podem diferir do texto estático do Figma. O conjunto fornecido tem quatro artes, reutilizadas no catálogo. A navegação ativa, sessão autenticada, foco visível e mensagens de erro também alteram as capturas conforme o estado.

O mobile continua oferecendo conteúdo além do viewport de 896 px do frame: descrição, itens relacionados, paginação e formulários podem exigir rolagem. Dados de colecionador e itens do checkout ficam disponíveis em seções expansíveis; a compra passa por revisão antes da confirmação. Os provedores sem carteira cadastrada ficam desabilitados. O recibo informa que a transação é simulada e abre seus dados em diálogo, sem link fictício para Etherscan. A conta mantém acesso a pedidos e favoritos; o painel Cenários é uma ferramenta extra para avaliação.

As baselines Playwright guardam a regressão da implementação, não substituem a comparação manual com o Figma. A revisão inclui capturas de nove rotas em desktop e mobile, com dados de carrinho comparáveis aos frames e sem overflow horizontal em 414 px. Login e cadastro mobile cabem em 896 px. Consulte [VALIDATION.md](VALIDATION.md) para os testes e as medições de performance.

## Performance aplicada

O app carrega em paralelo ao início do MSW e monta somente após a interceptação estar pronta. Diálogos Radix não participam do carregamento inicial quando fechados. O painel de cenários deixa de fazer uma chamada REST antes de ser aberto. Cards selecionam versões menores das artes com srcset/sizes, mantendo dimensões reservadas e lazy loading abaixo da primeira linha.

As variantes de 360 px pesam entre 11,5 e 15,2 kB, em comparação com 54,2–76,7 kB dos mesmos artworks de 900 px. A representação efetivamente escolhida depende do tamanho do card e da densidade da tela; em telas de maior densidade o navegador pode escolher 600/900 px.

O custo restante está principalmente na inicialização de React/router e do backend MSW no navegador. Uma versão com backend real poderia retirar o MSW da entrega e avaliar pré-renderização do catálogo; isso exige outro contrato de execução. As medições locais não substituem dados de usuários reais ou uma auditoria do host publicado.

## Resultado medido

Comparação com a auditoria anterior, usando Lighthouse 12.8.2, os mesmos perfis e mediana de três execuções por combinação. Execução final no código 1b1f59b, após encerrar os testes E2E.

| Página / perfil | Performance anterior | Performance final | LCP anterior | LCP final |
| --- | ---: | ---: | ---: | ---: |
| Início / mobile | 85 | 90 | 3827 ms | 3350 ms |
| Início / desktop | 99 | 99 | 968 ms | 792 ms |
| Detalhe / mobile | 88 | 92 | 3657 ms | 3176 ms |
| Detalhe / desktop | 99 | 100 | 833 ms | 765 ms |

Acessibilidade, boas práticas e SEO atingiram 100 nos quatro casos. Todas as medianas atendem às metas do desafio; o LCP mobile de aproximadamente 3,2–3,35 s continua sendo o próximo foco de otimização. Os 40 testes passaram na execução final, incluindo a comparação normal com as oito baselines revisadas. Os relatórios completos estão em [VALIDATION.md](VALIDATION.md).
