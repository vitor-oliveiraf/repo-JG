import { http, HttpResponse, delay, ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import {
  db,
  persist,
  cartFor,
  quoteFor,
  hash,
  reset,
  scenarios,
  changeNft,
  publish,
  settle,
  subscribe,
} from "./database";
import {
  units,
  type CartItem,
  type NftList,
  type Order,
  type User,
  type Wallet,
} from "../domain";
const error = (
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) => HttpResponse.json({ code, message, fields }, { status });
const publicUser = ({
  passwordHash: _,
  salt: __,
  ...user
}: User & { passwordHash: string; salt: string }) => user;
const session = (request: Request) => {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const entry = token ? db.sessions[token] : undefined;
  return entry && entry.expires > Date.now() ? entry : undefined;
};
const owner = (request: Request) =>
  session(request)?.userId ||
  `visitor:${request.headers.get("x-visitor-id") || "anonymous"}`;
const unauth = () =>
  error(
    401,
    "SESSION_EXPIRED",
    "Sua sessão expirou. Entre novamente para continuar.",
  );
const api = "/api";
const realtime = ws.link(/^wss?:\/\/[^/]+\/?$/);
const connections = new Set<() => void>();
export const handlers = [
  http.all(`${api}/*`, async ({ request }) => {
    if (request.url.includes("/demo")) return;
    if (db.scenario === "slow") await delay(1800);
    else if (db.scenario === "out-of-order") {
      const q = new URL(request.url).searchParams.get("q") || "";
      await delay(q.length % 2 ? 1200 : 150);
    } else await delay(120);
    if (db.scenario === "offline") return HttpResponse.error();
    if (db.scenario === "http-error")
      return error(
        503,
        "TRANSIENT",
        "Serviço temporariamente indisponível. Tente novamente.",
      );
    if (db.scenario === "expired" && !request.url.includes("/auth/")) {
      Object.values(db.sessions).forEach((s) => (s.expires = 0));
      persist();
    }
    if (
      request.headers.has("authorization") &&
      /\/api\/(cart|quote)(\/|$|\?)/.test(request.url) &&
      !session(request)
    )
      return unauth();
  }),
  http.post(`${api}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    const user = db.users.find(
      (u) => u.email.toLowerCase() === body.email?.toLowerCase(),
    );
    if (
      !user ||
      (await hash(body.password || "", user.salt)) !== user.passwordHash
    )
      return error(422, "INVALID_CREDENTIALS", "E-mail ou senha incorretos.", {
        email: "Confira suas credenciais.",
      });
    const token = crypto.randomUUID();
    db.sessions[token] = { userId: user.id, expires: Date.now() + 3600000 };
    const visitor = cartFor(
      `visitor:${request.headers.get("x-visitor-id") || "anonymous"}`,
    );
    const cart = cartFor(user.id);
    for (const line of visitor.items) {
      const match = cart.items.find(
        (i) => i.nftId === line.nftId && i.edition === line.edition,
      );
      const max = db.nfts.find((n) => n.id === line.nftId)!.editions[
        line.edition
      ];
      if (match) match.quantity = Math.min(max, match.quantity + line.quantity);
      else cart.items.push({ ...line, quantity: Math.min(max, line.quantity) });
    }
    visitor.items = [];
    cart.items = cart.items.filter((i) => i.quantity > 0);
    cart.revision++;
    persist();
    return HttpResponse.json({ token, user: publicUser(user) });
  }),
  http.post(`${api}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      email: string;
      password: string;
    };
    if (db.users.some((u) => u.email === body.email))
      return error(409, "EMAIL_CONFLICT", "Este e-mail já possui uma conta.", {
        email: "E-mail já cadastrado.",
      });
    if (
      !body.name ||
      !/^\S+@\S+\.\S+$/.test(body.email) ||
      body.password.length < 8
    )
      return error(422, "VALIDATION", "Confira os campos.", {
        password: "Use ao menos 8 caracteres.",
      });
    const id = crypto.randomUUID();
    const salt = crypto.randomUUID();
    const user = {
      id,
      name: body.name,
      email: body.email,
      username: body.email.split("@")[0],
      ens: "",
      nickname: "",
      avatar: "",
      salt,
      passwordHash: await hash(body.password, salt),
    };
    db.users.push(user);
    db.wallets[id] = [];
    persist();
    return HttpResponse.json(publicUser(user), { status: 201 });
  }),
  http.get(`${api}/auth/session`, ({ request }) => {
    const s = session(request);
    if (!s) return unauth();
    return HttpResponse.json(
      publicUser(db.users.find((u) => u.id === s.userId)!),
    );
  }),
  http.post(`${api}/auth/logout`, ({ request }) => {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (token) delete db.sessions[token];
    persist();
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${api}/nfts`, ({ request }) => {
    const p = new URL(request.url).searchParams;
    let items = db.scenario === "empty" ? [] : [...db.nfts];
    const q = (p.get("q") || "").toLowerCase();
    items = items.filter((n) => n.name.toLowerCase().includes(q));
    for (const filter of ["category", "network"] as const) {
      const values = (p.get(filter) || "").split(",").filter(Boolean);
      if (values.length)
        items = items.filter((n) => values.includes(n[filter]));
    }
    if (p.get("min"))
      items = items.filter((n) => units(n.price) >= units(p.get("min")!));
    if (p.get("max"))
      items = items.filter((n) => units(n.price) <= units(p.get("max")!));
    if (p.get("tab") === "new") items = items.filter((n) => n.rank > 20);
    if (p.get("tab") === "trending")
      items = items.filter((n) => n.rank % 2 === 0);
    const sort = p.get("sort");
    if (sort === "price-asc" || sort === "price-desc")
      items.sort(
        (a, b) =>
          (units(a.price) < units(b.price)
            ? -1
            : units(a.price) > units(b.price)
              ? 1
              : 0) * (sort === "price-desc" ? -1 : 1),
      );
    const page = Math.max(1, Number(p.get("page")) || 1);
    return HttpResponse.json({
      items: items.slice((page - 1) * 9, page * 9),
      total: items.length,
      page,
      pages: Math.ceil(items.length / 9),
      facets: {
        category: db.nfts.reduce<Record<string, number>>((counts, n) => {
          counts[n.category] = (counts[n.category] || 0) + 1;
          return counts;
        }, {}),
        network: db.nfts.reduce<Record<string, number>>((counts, n) => {
          counts[n.network] = (counts[n.network] || 0) + 1;
          return counts;
        }, {}),
      },
    } satisfies NftList);
  }),
  http.get(`${api}/nfts/:id`, ({ params }) => {
    const nft = db.nfts.find((n) => n.id === params.id);
    return nft
      ? HttpResponse.json(nft)
      : error(404, "NOT_FOUND", "NFT não encontrado.");
  }),
  http.get(`${api}/cart`, ({ request }) =>
    HttpResponse.json(cartFor(owner(request))),
  ),
  http.put(`${api}/cart/items`, async ({ request }) => {
    const body = (await request.json()) as CartItem & { mode?: "add" };
    const nft = db.nfts.find((n) => n.id === body.nftId);
    if (!nft) return error(404, "NOT_FOUND", "NFT não encontrado.");
    const cart = cartFor(owner(request));
    const item = cart.items.find(
      (i) => i.nftId === body.nftId && i.edition === body.edition,
    );
    const quantity =
      body.quantity + (body.mode === "add" ? item?.quantity || 0 : 0);
    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      !Object.hasOwn(nft.editions, body.edition)
    )
      return error(422, "VALIDATION", "Quantidade ou edição inválida.");
    if (quantity > nft.editions[body.edition])
      return error(
        409,
        "STOCK_CONFLICT",
        "Quantidade indisponível para esta edição.",
      );
    if (item) item.quantity = quantity;
    else if (quantity)
      cart.items.push({ nftId: body.nftId, edition: body.edition, quantity });
    cart.items = cart.items.filter((i) => i.quantity > 0);
    cart.revision++;
    persist();
    return HttpResponse.json(cart);
  }),
  http.put(`${api}/cart/coupon`, async ({ request }) => {
    const { coupon } = (await request.json()) as { coupon: string };
    if (coupon && coupon !== "KURIO10")
      return error(
        422,
        "INVALID_COUPON",
        coupon === "EXPIRED"
          ? "Este cupom expirou."
          : "Código promocional inválido.",
      );
    if (coupon && db.scenario === "coupon-expired")
      return error(422, "EXPIRED_COUPON", "Este cupom expirou.");
    const cart = cartFor(owner(request));
    cart.coupon = coupon;
    cart.revision++;
    persist();
    return HttpResponse.json(cart);
  }),
  http.get(`${api}/quote`, ({ request }) =>
    HttpResponse.json(quoteFor(owner(request))),
  ),
  http.get(`${api}/favorites`, ({ request }) => {
    const s = session(request);
    return s ? HttpResponse.json(db.favorites[s.userId] || []) : unauth();
  }),
  http.put(`${api}/favorites/:id`, async ({ request, params }) => {
    const s = session(request);
    if (!s) return unauth();
    if (db.scenario === "favorite-failure")
      return error(503, "TRANSIENT", "Não foi possível atualizar o favorito.");
    const { active } = (await request.json()) as { active: boolean };
    const list = new Set(db.favorites[s.userId] || []);
    if (active) list.add(String(params.id));
    else list.delete(String(params.id));
    db.favorites[s.userId] = [...list];
    persist();
    return HttpResponse.json([...list]);
  }),
  http.get(`${api}/profile`, ({ request }) => {
    const s = session(request);
    return s
      ? HttpResponse.json(publicUser(db.users.find((u) => u.id === s.userId)!))
      : unauth();
  }),
  http.put(`${api}/profile`, async ({ request }) => {
    const s = session(request);
    if (!s) return unauth();
    const data = (await request.json()) as Partial<User>;
    if (db.scenario === "validation")
      return error(422, "VALIDATION", "Nome de usuário indisponível.", {
        username: "Escolha outro nome de usuário.",
      });
    if (!data.name || !data.username || !data.email?.match(/^\S+@\S+\.\S+$/))
      return error(422, "VALIDATION", "Preencha os dados obrigatórios.");
    if (db.users.some((u) => u.id !== s.userId && u.email === data.email))
      return error(409, "EMAIL_CONFLICT", "E-mail já cadastrado.", {
        email: "Este e-mail já está em uso.",
      });
    const user = db.users.find((u) => u.id === s.userId)!;
    for (const key of [
      "name",
      "username",
      "email",
      "ens",
      "nickname",
      "avatar",
    ] as const)
      if (data[key] !== undefined) user[key] = data[key]!;
    persist();
    return HttpResponse.json(publicUser(user));
  }),
  http.put(`${api}/profile/password`, async ({ request }) => {
    const s = session(request);
    if (!s) return unauth();
    const { current, password } = (await request.json()) as {
      current: string;
      password: string;
    };
    const u = db.users.find((u) => u.id === s.userId)!;
    if ((await hash(current, u.salt)) !== u.passwordHash)
      return error(422, "VALIDATION", "Senha atual incorreta.", {
        current: "Senha atual incorreta.",
      });
    if (password.length < 8)
      return error(422, "VALIDATION", "Use ao menos 8 caracteres.", {
        password: "Senha muito curta.",
      });
    u.passwordHash = await hash(password, u.salt);
    persist();
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${api}/wallets`, ({ request }) => {
    const s = session(request);
    return s ? HttpResponse.json(db.wallets[s.userId] || []) : unauth();
  }),
  http.put(`${api}/wallets`, async ({ request }) => {
    const s = session(request);
    if (!s) return unauth();
    const data = (await request.json()) as Wallet;
    const valid =
      data.network === "Solana"
        ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(data.address)
        : /^0x[0-9a-fA-F]{40}$/.test(data.address);
    if (!valid)
      return error(422, "VALIDATION", "Endereço de carteira inválido.", {
        address: "Confira o endereço para a rede selecionada.",
      });
    if (
      db.scenario === "validation" ||
      !data.name ||
      !data.nickname ||
      !data.provider
    )
      return error(422, "VALIDATION", "Confira os campos da carteira.", {
        nickname: "Informe o apelido da carteira.",
      });
    const wallets = db.wallets[s.userId] ?? (db.wallets[s.userId] = []);
    data.id = data.id || crypto.randomUUID();
    const index = wallets.findIndex((w) => w.id === data.id);
    if (data.primary) wallets.forEach((w) => (w.primary = false));
    if (index < 0) wallets.push(data);
    else wallets[index] = data;
    persist();
    return HttpResponse.json(data);
  }),
  http.post(`${api}/wallets/:id/connect`, ({ request, params }) => {
    const s = session(request);
    if (!s) return unauth();
    if (!(db.wallets[s.userId] || []).some((w) => w.id === params.id))
      return error(403, "FORBIDDEN", "Carteira não permitida.");
    return db.scenario === "wallet-refused"
      ? error(
          409,
          "CONNECTION_REFUSED",
          "Conexão recusada pela carteira simulada.",
        )
      : HttpResponse.json({ connected: true });
  }),
  http.post(`${api}/orders`, async ({ request }) => {
    const s = session(request);
    if (!s) return unauth();
    const body = (await request.json()) as {
      quoteId: string;
      walletId: string;
      network: string;
      collector: Record<string, string>;
    };
    const key = request.headers.get("idempotency-key");
    if (!key)
      return error(
        422,
        "IDEMPOTENCY_REQUIRED",
        "Chave de idempotência obrigatória.",
      );
    const attemptKey = `${s.userId}:${key}`;
    const signature = JSON.stringify(body);
    const previous = db.attempts[attemptKey];
    if (previous) {
      if (previous.body !== signature)
        return error(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Esta chave já foi usada com outro conteúdo.",
        );
      settle();
      return HttpResponse.json(db.orders[previous.orderId]);
    }
    if (db.scenario === "price-changed" || db.scenario === "sold-out") {
      changeNft(cartFor(s.userId).items[0]?.nftId, db.scenario === "sold-out");
      db.scenario = "standard";
      persist();
    }
    const quote = quoteFor(s.userId);
    if (quote.id !== body.quoteId || !quote.valid)
      return error(
        409,
        "QUOTE_CHANGED",
        "Preço ou disponibilidade mudou. Revise a cotação e confirme novamente.",
      );
    const wallet = db.wallets[s.userId]?.find(
      (w) => w.id === body.walletId && w.network === body.network,
    );
    if (!wallet)
      return error(
        422,
        "VALIDATION",
        "Selecione uma carteira compatível com a rede.",
      );
    if (!body.collector.name || !body.collector.email)
      return error(422, "VALIDATION", "Informe os dados do colecionador.");
    const id = crypto.randomUUID();
    const order: Order = {
      id,
      userId: s.userId,
      status: "pending",
      quote: structuredClone(quote),
      wallet: structuredClone(wallet),
      collector: body.collector,
      transaction: `0x${id.replaceAll("-", "").padEnd(64, "0")}`,
      createdAt: new Date().toISOString(),
      settleAt: Date.now() + 2500,
      version: 1,
      outcome: db.scenario === "payment-refused" ? "refused" : "confirmed",
    };
    db.orders[id] = order;
    db.attempts[attemptKey] = { body: signature, orderId: id };
    persist();
    publish("order.updated", order);
    if (db.scenario === "order-timeout") {
      await delay(12000);
      return HttpResponse.error();
    }
    return HttpResponse.json(order, { status: 201 });
  }),
  http.get(`${api}/orders`, ({ request }) => {
    const s = session(request);
    if (!s) return unauth();
    settle();
    return HttpResponse.json(
      Object.values(db.orders).filter((o) => o.userId === s.userId),
    );
  }),
  http.get(`${api}/orders/:id`, ({ request, params }) => {
    const s = session(request);
    if (!s) return unauth();
    settle();
    const order = db.orders[String(params.id)];
    if (!order) return error(404, "NOT_FOUND", "Pedido não encontrado.");
    if (order.userId !== s.userId)
      return error(403, "FORBIDDEN", "Você não tem acesso a este pedido.");
    return HttpResponse.json(order);
  }),
  http.get(`${api}/demo`, () =>
    HttpResponse.json({ scenario: db.scenario, scenarios }),
  ),
  http.post(`${api}/demo`, async ({ request }) => {
    const { action, scenario, nftId } = (await request.json()) as {
      action: string;
      scenario: string;
      nftId: string;
    };
    if (action === "reset") await reset(scenario);
    if (action === "scenario") {
      db.scenario = scenario;
      persist();
    }
    if (action === "expire") {
      Object.values(db.sessions).forEach((s) => (s.expires = 0));
      persist();
    }
    if (action === "price" || action === "stock")
      changeNft(nftId || db.nfts[0].id, action === "stock");
    if (action === "duplicate" || action === "old") {
      const nft = db.nfts.find((n) => n.id === (nftId || db.nfts[0].id))!;
      publish(
        "nft.updated",
        nft,
        action === "old" ? nft.version - 1 : nft.version,
      );
    }
    if (action === "disconnect") connections.forEach((close) => close());
    return HttpResponse.json({ ok: true });
  }),
  realtime.addEventListener("connection", (connection) => {
    const io = toSocketIo(connection);
    let token = "";
    let closed = false;
    const send = (event: string, data: unknown) => {
      if (!closed) io.client.emit(event, data);
    };
    const off = subscribe((name, event) => {
      if (event.userId) {
        const s = db.sessions[token];
        if (!s || s.expires < Date.now() || s.userId !== event.userId) return;
      }
      send(name, event);
    });
    const close = () => connection.client.close(1012, "Reconexão simulada");
    connections.add(close);
    connection.client.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      if (event.data === "2") connection.client.send("3");
      if (event.data.startsWith("40")) {
        try {
          token = JSON.parse(event.data.slice(2) || "{}").token || "";
        } catch {
          /* guest */
        }
      }
    });
    const timer = setInterval(() => {
      if (!closed) settle();
    }, 200);
    const ping = setInterval(() => {
      if (!closed) connection.client.send("2");
    }, 20000);
    connection.client.addEventListener("close", () => {
      closed = true;
      clearInterval(timer);
      clearInterval(ping);
      off();
      connections.delete(close);
    });
  }),
];
