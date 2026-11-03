# Arquitetura e decisões

## Fronteiras

React representa a interface; TanStack Router possui rotas, search params e proteção; TanStack Query possui estado remoto e ciclo de mutations; Axios é o único cliente REST da aplicação. MSW representa o backend inteiro, sem ramificações de negócio fictícias em componentes ou no Axios. O cliente Socket.IO usa o mesmo caminho de produção, interceptado na rede pelo MSW.

O bootstrap inicializa os mocks antes de importar o router e seus componentes. Isso evita que o engine.io-client capture o WebSocket nativo antes da instalação do interceptor. Os mocks entram em chunk separado e podem ser desligados por configuração. Autenticação, conta, checkout e cliente Socket.IO são carregados sob demanda para reduzir o trabalho inicial. A conexão continua reconciliando os recursos ativos com REST assim que fica disponível.

## Cache e sincronização

Queries usam `staleTime` 30 s e coleta após 5 min. Sessão usa 15 s. Uma única repetição é permitida para falhas de conexão/5xx nas queries; mutations nunca têm retry automático. Todas as leituras Axios recebem `AbortSignal`. Chaves do catálogo incluem os parâmetros da URL; mudar filtros começa na página 1. Dados privados usam ID do usuário na chave.

Mutations do carrinho substituem seu cache e invalidam a cotação. Perfil atualiza sessão e cache do perfil. Carteiras invalidam sua lista. Favoritos fazem atualização otimista com snapshot e rollback em falha. O protocolo de pedidos usa retry explícito com a mesma chave e corpo persistidos.

Eventos carregam versão monotônica e identidade estável; o cliente compara versões antes de atualizar. Após reconectar, consultas ativas são reconciliadas com REST. O socket é recriado quando a identidade da sessão muda e libera listeners/conexão no cleanup. Notificações de preço e estado do pedido usam região `status` acessível.

## Sessão e persistência

O banco simulado usa `kurio.mock.v1` no localStorage; autenticação usa token fictício persistente, com expiração de uma hora. As senhas persistidas são derivadas com PBKDF2/SHA-256, salt individual e 10.000 iterações. Isso evita texto puro na simulação; não é uma implementação de autenticação para produção. As credenciais de demonstração são explicitamente públicas.

Logout cancela queries, limpa o QueryClient e remove token. Um 401 faz o mesmo e preserva a URL para login e retomada. Tokens revogados/expirados não recebem eventos privados. Tentativas de pedido são separadas por usuário; nenhum pedido de outro usuário pode ser consultado. O carrinho visitante tem identidade própria e é mesclado com o carrinho autenticado respeitando o estoque. O reset remove integralmente o cenário persistido.

O armazenamento é local ao navegador: não há sincronização entre dispositivos. O banco é uma simulação em uma aba; edição concorrente entre abas não equivale a transações de um backend real.

## Valores e compra

ETH trafega em strings. Cálculos convertem para unidades de 18 casas com BigInt e voltam a strings, sem ponto flutuante. Cupom KURIO10 usa desconto inteiro de 10% em unidades mínimas; taxa simulada é 0.016 ETH para carrinhos não vazios.

A cotação é a autoridade para finalizar. Checkout reconsulta antes de abrir a revisão; criação recalcula e rejeita divergência. O recibo é snapshot persistido e não depende do catálogo atual. Pedidos possuem estados terminais e recuperam o processamento por REST após refresh. O cenário timeout cria e persiste antes de atrasar a resposta.

## Interface e acessibilidade

Paleta do Figma: ink #140D0A, card #241612, primary #D28A4C, foreground #F5F1EB, secondary #CFB28C. Roboto Mono é servida localmente via Fontsource. Os quatro artworks do Figma são reutilizados em seus slots e convertidos a WebP (900 px, qualidade 85), sem redesenho da arte.

Layouts fluidos com pontos de adaptação em 1.280, 900 e 600 px, cobrindo 390, 768 e 1.440 px. Frames de perfil/carteiras/recibo são adaptados para mobile. Skeletons preservam espaço e respeitam reduced-motion. Diálogos usam Radix para foco, Escape, semântica e contenção. Inputs têm labels e associação de erros. Imagens relevantes têm descrição; imagens repetidas/decorativas usam alt vazio.

Desvios deliberados: o catálogo oferece checkboxes explícitos para seleção múltipla; adiciona rótulos de formulário e informações de disponibilidade. Ações editoriais, newsletter, redes sociais e recuperação externa não simulam sucesso; indicam indisponibilidade ou usam navegação real. Autenticação desktop usa diálogo sobre o catálogo, e mobile usa uma página dedicada, seguindo os frames. O recibo é uma rota recuperável que mantém o snapshot da compra. O painel de cenários é um recurso adicional para avaliação.

## Validação e evidências

Playwright executa Chromium/Chrome em desktop e mobile, usa contextos isolados, reset REST via MSW, relógio controlado e eventos pelo socket real. A regressão visual possui início, detalhe, carrinho e pagamento. Axe complementa navegação por teclado. HTML e traces de falhas são gerados automaticamente.

Lighthouse usa build otimizado, imagens/fontes reais e cenário padrão dos mocks. `scripts/lighthouse.mjs` faz três execuções por página/perfil e guarda HTML, JSON, mediana de cada categoria e LCP/CLS/TBT, além do ambiente. Resultados medidos e limitações devem ser consultados em `reports/lighthouse/summary.json`.

## Limitações do mock

Sem blockchain, pagamentos reais ou extensão de carteira. O binding Socket.IO não possui toda a implementação de servidor; a demonstração usa WebSocket, namespace padrão e entrega local de eventos, sem polling e sem rooms. MSW intercepta REST via Service Worker e WebSocket no contexto do navegador. Requer HTTPS ou localhost. Estado e tokens são inspecionáveis por definição de simulação; nunca devem ser usados para dados reais.
