import { catalog, people, initialWallet } from "./fixtures";
import {
  decimal,
  units,
  type Cart,
  type Nft,
  type Order,
  type Quote,
  type User,
  type Wallet,
  type DomainEvent,
} from "../domain";
const KEY = "kurio.mock.v1";
type RecordUser = User & { passwordHash: string; salt: string };
export interface Database {
  nfts: Nft[];
  users: RecordUser[];
  sessions: Record<string, { userId: string; expires: number }>;
  carts: Record<string, Cart>;
  wallets: Record<string, Wallet[]>;
  favorites: Record<string, string[]>;
  orders: Record<string, Order>;
  attempts: Record<string, { body: string; orderId: string }>;
  scenario: string;
  counter: number;
}
export const scenarios = [
  "standard",
  "empty",
  "slow",
  "out-of-order",
  "offline",
  "http-error",
  "expired",
  "validation",
  "favorite-failure",
  "coupon-expired",
  "price-changed",
  "sold-out",
  "order-timeout",
  "payment-refused",
  "wallet-refused",
] as const;
export async function hash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: new TextEncoder().encode(salt),
          iterations: 10000,
        },
        key,
        256,
      ),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export let db: Database;
export const persist = () => localStorage.setItem(KEY, JSON.stringify(db));
export async function reset(scenario = "standard") {
  db = {
    nfts: catalog(),
    users: await Promise.all(
      people.map(async (u) => ({
        ...u,
        salt: u.id,
        passwordHash: await hash("Kurio123!", u.id),
      })),
    ),
    sessions: {},
    carts: {},
    wallets: Object.fromEntries(people.map((u) => [u.id, [initialWallet(u)]])),
    favorites: {},
    orders: {},
    attempts: {},
    scenario,
    counter: 0,
  };
  persist();
}
export async function init() {
  try {
    db = JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    /* reset corrupt storage */
  }
  if (!db) await reset();
}
export const cartFor = (owner: string): Cart =>
  db.carts[owner] ?? (db.carts[owner] = { items: [], coupon: "", revision: 0 });
export function quoteFor(owner: string): Quote {
  const cart = cartFor(owner);
  const issues: string[] = [];
  if (cart.coupon && db.scenario === "coupon-expired")
    issues.push("O cupom aplicado expirou. Remova-o ou utilize outro código.");
  const lines = cart.items.map((item) => {
    const nft = db.nfts.find((n) => n.id === item.nftId)!;
    if (item.quantity > nft.editions[item.edition])
      issues.push(
        `${nft.name}: edição sem disponibilidade para a quantidade selecionada.`,
      );
    return {
      ...item,
      available: nft.editions[item.edition],
      name: nft.name,
      image: nft.image,
      price: nft.price,
      total: decimal(units(nft.price) * BigInt(item.quantity)),
      version: nft.version,
    };
  });
  const subtotal = lines.reduce((s, l) => s + units(l.total), 0n);
  const discount = cart.coupon === "KURIO10" ? subtotal / 10n : 0n;
  const fee = lines.length ? units("0.016") : 0n;
  const id = JSON.stringify([
    cart.revision,
    cart.coupon,
    ...lines.map((l) => [l.nftId, l.edition, l.quantity, l.version]),
  ]);
  return {
    id,
    lines,
    subtotal: decimal(subtotal),
    discount: decimal(discount),
    fee: decimal(fee),
    total: decimal(subtotal - discount + fee),
    coupon: cart.coupon,
    valid: !!lines.length && !issues.length,
    issues,
  };
}
type Listener = (
  name: "nft.updated" | "order.updated",
  event: DomainEvent<Nft | Order>,
) => void;
const listeners = new Set<Listener>();
export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function publish(
  name: "nft.updated" | "order.updated",
  data: Nft | Order,
  eventVersion = data.version,
) {
  const event = {
    eventId: `${data.id}:${eventVersion}`,
    resourceId: data.id,
    version: eventVersion,
    userId: "userId" in data ? data.userId : undefined,
    data: structuredClone(data),
  };
  listeners.forEach((fn) => fn(name, event));
}
export function changeNft(id: string, soldOut = false) {
  const nft = db.nfts.find((n) => n.id === id);
  if (!nft) return;
  nft.version++;
  if (soldOut)
    Object.keys(nft.editions).forEach((e) => {
      nft.editions[e as keyof typeof nft.editions] = 0;
    });
  else nft.price = decimal(units(nft.price) + units("0.1"));
  persist();
  publish("nft.updated", nft);
}
export function settle() {
  let changed = false;
  for (const order of Object.values(db.orders)) {
    if (order.status !== "pending" || Date.now() < order.settleAt) continue;
    order.status = order.outcome;
    order.version++;
    if (order.status === "confirmed") {
      const cart = cartFor(order.userId);
      for (const line of order.quote.lines) {
        const item = cart.items.find(
          (i) => i.nftId === line.nftId && i.edition === line.edition,
        );
        if (item) item.quantity = Math.max(0, item.quantity - line.quantity);
        const nft = db.nfts.find((n) => n.id === line.nftId)!;
        nft.editions[line.edition] = Math.max(
          0,
          nft.editions[line.edition] - line.quantity,
        );
        nft.version++;
        publish("nft.updated", nft);
      }
      cart.items = cart.items.filter((i) => i.quantity > 0);
      cart.revision++;
    }
    changed = true;
    publish("order.updated", order);
  }
  if (changed) persist();
}
