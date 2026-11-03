import type { Nft, User, Wallet } from "../domain";
const names = [
  "Emerald Ape #042",
  "Sage Nomad #009",
  "Neon Vessel #552",
  "Cosmic Bloom #118",
  "Violet Nomad #314",
  "Ivory Baron #088",
  "Golden Beat #207",
  "Amber Frequency #101",
  "Golden Signal #160",
];
const prices = [
  "1.19",
  "1.69",
  "1.99",
  "1.29",
  "1.39",
  "1.79",
  "0.99",
  "0.79",
  "0.39",
];
const art = [
  "home-imgFrame136.webp",
  "home-imgNftArtwork18.webp",
  "home-imgNftArtwork05.webp",
  "home-imgNftArtwork18.webp",
  "home-imgNftArtwork18.webp",
  "home-imgNftArtwork05.webp",
  "home-imgNftArtwork09.webp",
  "home-imgNftArtwork09.webp",
  "home-imgNftArtwork09.webp",
];
export const categories = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
];
export function catalog(): Nft[] {
  return Array.from({ length: 36 }, (_, i) => ({
    id: i === 0 ? "emerald-ape-042" : `nft-${i + 1}`,
    name:
      i < 9
        ? names[i]
        : `${names[i % 9].split(" #")[0]} #${String(i + 201).padStart(3, "0")}`,
    price: prices[i % 9],
    originalPrice: i === 2 ? "2.29" : undefined,
    image: `/assets/${art[i % 9]}`,
    collection: "Kurio Apes",
    category: categories[i < 9 ? 0 : i % 9],
    network: (["Ethereum", "Polygon", "Solana"] as const)[i < 9 ? 0 : i % 3],
    version: 1,
    editions: { "1/1": i === 0 ? 0 : 1, "1/10": 10, "1/50": 50, ABERTA: 100 },
    rank: 36 - i,
  }));
}
export const people: User[] = [
  {
    id: "collector-1",
    name: "Nova Sato",
    username: "nova",
    email: "nova@kurio.test",
    ens: "nova",
    nickname: "Minha carteira",
    avatar: "",
  },
  {
    id: "collector-2",
    name: "Alex Lima",
    username: "alex",
    email: "alex@kurio.test",
    ens: "alex",
    nickname: "Estúdio",
    avatar: "",
  },
];
export const initialWallet = (user: User): Wallet => ({
  id: `wallet-${user.id}`,
  name: user.name,
  nickname: "Carteira principal",
  address: `0x${user.id.endsWith("1") ? "1" : "2"}`.padEnd(42, "0"),
  network: "Ethereum",
  provider: "MetaMask",
  primary: true,
  profileName: user.username,
  referral: "KURIO",
  email: user.email,
  ens: user.ens,
  secondary: "",
});
