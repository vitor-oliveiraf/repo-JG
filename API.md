# Contratos REST e eventos

Base `/api`. JSON UTF-8. `Authorization: Bearer <token>` identifica a sessão; `X-Visitor-Id` identifica o carrinho do visitante. ETH sempre é string decimal não negativa com até 18 casas; quantidades são inteiros. IDs são strings estáveis. Tipos completos: `src/domain.ts`.

## Recursos

| Método / rota | Entrada | Saída / comportamento |
| --- | --- | --- |
| POST /auth/register | name, email, password | 201 User; 409 e-mail existente; mínimo 8 caracteres |
| POST /auth/login | email, password | token, user; mescla carrinho visitante e autentica |
| GET /auth/session | token | User ou 401 |
| POST /auth/logout | token | 204; revoga token |
| GET /nfts | q, category, network, min, max, sort, tab, page | items, total, page, pages, facets; página de 9 itens |
| GET /nfts/:id | identificador | Nft ou 404 |
| GET /favorites | sessão | string[] de IDs |
| PUT /favorites/:id | active: boolean | lista atualizada |
| GET /cart | sessão ou visitante | items, coupon, revision |
| PUT /cart/items | nftId, edition, quantity, mode? | Cart; mode add soma, ausência substitui; zero remove |
| PUT /cart/coupon | coupon | Cart; string vazia remove |
| GET /quote | identidade do carrinho | Quote autoritativa, linhas, descontos, taxa, total, issues |
| POST /orders | quoteId, walletId, network, collector | 201 Order pending; exige Idempotency-Key |
| GET /orders | sessão | pedidos do usuário; reconcilia pendentes |
| GET /orders/:id | sessão | Order; 403 de outro usuário; 404 inexistente |
| GET /profile | sessão | User |
| PUT /profile | name, username, email, ens, nickname, avatar | User; avatar é data URL validada pela UI |
| PUT /profile/password | current, password | 204; senha atual incorreta é 422 |
| GET /wallets | sessão | Wallet[] |
| PUT /wallets | Wallet; id opcional | cria ou atualiza carteira; valida endereço por rede |
| POST /wallets/:id/connect | sessão | connected true ou recusa 409 |

`category` e `network` aceitam múltiplos valores separados por vírgula. `sort`: recent, price-asc, price-desc. `tab`: new, trending ou ausente. Filtros são combinados com AND entre grupos e OR dentro de cada grupo.

## Quote e pedidos

Exemplo de linha de cotação:

```json
{"nftId":"emerald-ape-042","edition":"1/50","quantity":2,"name":"Emerald Ape #042","image":"/assets/home-imgFrame136.webp","price":"1.19","total":"2.38","version":1}
```

Uma Quote contém `id`, `lines`, `subtotal`, `discount`, `fee`, `total`, `coupon`, `valid`, `issues`. Seu identificador representa revisão do carrinho, cupom, quantidades e versões do catálogo. A criação compara essa identidade com uma cotação recalculada, além de validar carteira e sessão. Preço ou estoque alterado retorna 409 `QUOTE_CHANGED` e exige nova revisão.

Idempotência é indexada por usuário e chave. O primeiro POST persiste o pedido e sua assinatura antes de responder. O mesmo corpo e chave recuperam o pedido original; conteúdo diferente com a mesma chave gera 409 `IDEMPOTENCY_CONFLICT`. A ordem das propriedades faz parte da assinatura nesta simulação; o cliente persiste e reenvia exatamente o corpo original. A aplicação salva a tentativa antes do POST e a preserva após timeout/refresh.

Estados: `pending → confirmed` ou `pending → refused`. Estados terminais não são reaplicados. O processamento considera `settleAt`: o socket e as consultas REST reconciliam o estado. Não há dependência de uma aba permanecer aberta. O recibo usa cópias do catálogo, da carteira e dos dados do colecionador do momento da compra. Confirmação remove apenas quantidades compradas; recusa preserva itens.

## Erros

```json
{"code":"VALIDATION","message":"Endereço de carteira inválido.","fields":{"address":"Confira o endereço para a rede selecionada."}}
```

HTTP 401 sessão inválida/expirada; 403 sem permissão; 404 inexistente; 409 conflito de cadastro, disponibilidade, cotação ou idempotência; 422 validação; 503 falha transitória. Os cenários também suportam erro de conexão e timeout sem resposta HTTP.

## Eventos Socket.IO

Transporte WebSocket, namespace padrão, path `/socket.io/`, Engine.IO v4. O cliente envia `auth.token`. MSW `ws.link` intercepta a conexão e `@mswjs/socket.io-binding` codifica os eventos no protocolo Socket.IO. O MSW normaliza o path Socket.IO na correspondência do handler; o handler de demonstração corresponde à raiz da origem.

```ts
interface DomainEvent<T> {
  eventId: string;
  resourceId: string;
  version: number;
  userId?: string;
  data: T;
}
```

| Evento | Payload | Efeito |
| --- | --- | --- |
| nft.updated | DomainEvent<Nft> | Atualiza detalhe e invalida catálogo, carrinho e cotação |
| order.updated | DomainEvent<Order> | Atualiza pedido do usuário, lista de pedidos e carrinho ao terminar |

Versões repetidas/antigas são descartadas antes de atualizar cache; `order.updated` de outro usuário é recusado tanto na emissão quanto no consumo. Reconexão invalida recursos ativos para consultar o estado autoritativo via REST. O mock implementa ping/pong e liberação de listeners/timers no fechamento. Não implementa polling HTTP, namespaces personalizados, rooms ou infraestrutura distribuída.

## Controle de cenários

`GET /demo` retorna cenário e opções. `POST /demo` recebe `action` e parâmetros opcionais `scenario`, `nftId`. Ações: reset, scenario, expire, price, stock, duplicate, old, disconnect. É uma API exclusiva da camada de mocks, compartilhada pelo painel e pelos testes; não é parte de um backend de produção.
