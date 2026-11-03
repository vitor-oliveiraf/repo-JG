# Kurio — NFT Marketplace

Aplicação React e TypeScript para descoberta, compra simulada e conta do colecionador. Design baseado nos frames desktop e mobile do [Figma](https://www.figma.com/design/4Ua6Jy9VzOmc2sITGli3lW/Frontend-Challenge--Copy-).

## Executar a partir de um checkout limpo

Node.js 22 LTS atualizado e npm. Não exige backend, carteira, chave de API ou conta de pagamento.

```sh
npm ci
npm run dev
```

Abra http://localhost:5173. Os mocks estão ativos por padrão em desenvolvimento e produção. Imagens e fontes são locais. Não abra `index.html` pelo protocolo `file:`: o Service Worker precisa de localhost ou HTTPS.

```sh
npm run typecheck
npm run lint
npm run build
npm run preview
npx playwright install chrome
npm test
npm run test:production
npm run test:update
npm run audit
```

`preview` usa http://localhost:4173; mantenha-o aberto em outro terminal para a auditoria. `AUDIT_URL` permite auditar outra URL. Playwright inicia o servidor de desenvolvimento automaticamente. Baselines visuais foram produzidas em Windows/Chrome; diferenças de rasterização entre sistemas exigem baselines específicas. O CI executa os fluxos funcionais e guarda relatório/traces, sem comparar imagens Windows em Linux.

`test:production` valida o posicionamento de login, cadastro e diálogos no build otimizado, em desktop, tela larga e janela baixa. Execute após o build. Para conferir um deploy existente, defina `DEPLOY_URL` com sua URL antes do comando.

## Contas fictícias

| E-mail | Senha | Perfil |
| --- | --- | --- |
| nova@kurio.test | Kurio123! | Nova Sato |
| alex@kurio.test | Kurio123! | Alex Lima |

Ambas começam com uma carteira fictícia Ethereum. Também é possível criar contas. O cupom `KURIO10` concede 10%; `EXPIRED` representa um cupom expirado. Não use dados reais: todo o estado fica neste navegador e pode ser inspecionado ou apagado.

## Cenários reproduzíveis

O botão **Cenários**, no canto inferior direito, abre o laboratório. **Resetar todos os dados** restaura o catálogo, os dois usuários, carteiras, sessão, favoritos, carrinhos e pedidos. Cenários são persistentes até trocar a opção ou resetar.

| Cenário | Como observar |
| --- | --- |
| standard | Fluxos de compra e conta bem-sucedidos |
| empty | Catálogo vazio |
| slow | Skeletons de catálogo, detalhe e resumo; latência de 1,8 s |
| out-of-order | Buscas com latências determinísticas alternadas de 150/1.200 ms |
| offline | Erro de conexão na camada MSW |
| http-error | HTTP 503; volte para standard e use Tentar novamente |
| expired | Próxima operação privada expira a sessão |
| validation | Erros de API no perfil e nas carteiras |
| favorite-failure | Favoritar falha com rollback da atualização otimista |
| coupon-expired | KURIO10 é recusado por expiração |
| price-changed / sold-out | Criação do pedido altera preço/estoque e recusa a cotação anterior |
| order-timeout | A API cria o pedido, mas atrasa a resposta além do timeout do Axios. Recupere a mesma tentativa |
| payment-refused | Pedido termina recusado, preservando o carrinho |
| wallet-refused | A conexão simulada da carteira é recusada |

As ações **Alterar preço**, **Esgotar edição**, **Evento duplicado**, **Evento antigo** e **Interromper Socket.IO** atuam no Emerald Ape. Adicione-o ao carrinho e abra o checkout para acompanhar preço, disponibilidade e reconexão. Os eventos são codificados pelo binding e recebidos por `socket.io-client`; o painel não altera o cache da aplicação diretamente.

## Configuração e publicação

Consulte `.env.example`. `VITE_MOCKS=false` desliga a simulação; nesse caso é necessário fornecer REST e Socket.IO compatíveis em `VITE_API_URL` e `VITE_SOCKET_URL`. Deixe os mocks habilitados na entrega pública.

Para Vercel, importe o repositório, selecione Vite, use `npm run build` e saída `dist`. `vercel.json` configura o fallback das rotas para permitir acesso direto e refresh. Não é necessário servidor Socket.IO externo: MSW intercepta o transporte WebSocket no navegador. O mesmo vale para outros hosts estáticos com fallback SPA e HTTPS.

## Organização

- `src/domain.ts`: contratos e cálculo ETH com inteiros de 18 casas decimais.
- `src/mocks`: fixtures, banco persistente, handlers REST e Socket.IO.
- `src/lib`: Axios, queries/mutations, sessão e sincronização em tempo real.
- `src/components/ui`: componentes shadcn/ui adaptados, baseados em Radix e CVA.
- `src/pages`: telas responsivas; `src/router.tsx`: rotas e proteção.
- `tests`: E2E, acessibilidade e baselines visuais.
- `reports`: evidências Playwright e Lighthouse.

Detalhes dos contratos estão em [API.md](API.md); decisões, cache, sessão e limitações em [ARCHITECTURE.md](ARCHITECTURE.md).

Revisão de fidelidade e diferenças deliberadas: [FIGMA_REVIEW.md](reports/FIGMA_REVIEW.md). Resultados medidos de performance e testes: [VALIDATION.md](reports/VALIDATION.md).
