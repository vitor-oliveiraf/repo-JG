export type Network = "Ethereum" | "Polygon" | "Solana";
export type Edition = "1/1" | "1/10" | "1/50" | "ABERTA";
export interface Nft {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  image: string;
  collection: string;
  network: Network;
  category: string;
  version: number;
  editions: Record<Edition, number>;
  rank: number;
}
export interface NftList {
  items: Nft[];
  total: number;
  page: number;
  pages: number;
  facets: { category: Record<string, number>; network: Record<string, number> };
}
export interface CartItem {
  nftId: string;
  edition: Edition;
  quantity: number;
}
export interface Cart {
  items: CartItem[];
  coupon: string;
  revision: number;
}
export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  ens: string;
  nickname: string;
  avatar: string;
}
export interface Wallet {
  id: string;
  name: string;
  nickname: string;
  address: string;
  network: Network;
  provider: string;
  primary: boolean;
  profileName: string;
  referral: string;
  email: string;
  ens: string;
  secondary: string;
}
export interface QuoteLine extends CartItem {
  available: number;
  name: string;
  image: string;
  price: string;
  total: string;
  version: number;
}
export interface Quote {
  id: string;
  lines: QuoteLine[];
  subtotal: string;
  discount: string;
  fee: string;
  total: string;
  coupon: string;
  valid: boolean;
  issues: string[];
}
export interface Order {
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "refused";
  quote: Quote;
  wallet: Wallet;
  collector: Record<string, string>;
  transaction: string;
  createdAt: string;
  settleAt: number;
  version: number;
  outcome: "confirmed" | "refused";
}
export interface DomainEvent<T> {
  eventId: string;
  resourceId: string;
  version: number;
  userId?: string;
  data: T;
}
export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}
export const units = (value: string): bigint => {
  if (!/^\d+(\.\d{1,18})?$/.test(value)) throw new Error("Valor ETH inválido");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
};
export const decimal = (value: bigint): string => {
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n)
    .toString()
    .padStart(18, "0")
    .replace(/0+$/, "");
  return `${whole}${fraction ? "." + fraction : ""}`;
};
export const eth = (value: string) => `${value} ETH`;
