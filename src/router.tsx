import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Link,
} from "@tanstack/react-router";
import { Layout } from "./components/layout";
import { Catalog, type CatalogSearch } from "./pages/catalog";
import { Detail } from "./pages/detail";
import { CartPage } from "./pages/cart";
import { AuthPage } from "./pages/auth";
import { Checkout, OrderPage } from "./pages/checkout";
import { Profile, Wallets, Favorites, Orders } from "./pages/account";
import { queryClient, sessionOptions } from "./lib/api";
const root = createRootRoute({
  component: Layout,
  notFoundComponent: () => (
    <div className="empty">
      <h1>Página não encontrada</h1>
      <Link to="/">Voltar ao início →</Link>
    </div>
  ),
});
const index = createRoute({
  getParentRoute: () => root,
  path: "/",
  component: Catalog,
  validateSearch: (raw: Record<string, unknown>): CatalogSearch => {
    const search: CatalogSearch = {};
    for (const k of ["q", "category", "network", "sort", "tab"] as const)
      if (typeof raw[k] === "string" && raw[k]) search[k] = raw[k];
    for (const k of ["min", "max"] as const)
      if (typeof raw[k] === "string" && /^\d+(\.\d{1,18})?$/.test(raw[k]))
        search[k] = raw[k];
    if (Number.isInteger(Number(raw.page)) && Number(raw.page) > 0)
      search.page = Number(raw.page);
    if (raw.market) search.market = true;
    return search;
  },
});
const detail = createRoute({
  getParentRoute: () => root,
  path: "/nft/$id",
  component: Detail,
});
const cart = createRoute({
  getParentRoute: () => root,
  path: "/carrinho",
  component: CartPage,
});
const authSearch = (s: Record<string, unknown>): { redirect?: string } => ({
  redirect:
    typeof s.redirect === "string" &&
    s.redirect.startsWith("/") &&
    !s.redirect.startsWith("//")
      ? s.redirect
      : undefined,
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  component: () => <AuthPage />,
  validateSearch: authSearch,
});
const register = createRoute({
  getParentRoute: () => root,
  path: "/cadastro",
  component: () => <AuthPage register />,
  validateSearch: authSearch,
});
const protect = async ({ location }: { location: { href: string } }) => {
  const user = await queryClient.fetchQuery(sessionOptions());
  if (!user)
    throw redirect({ to: "/login", search: { redirect: location.href } });
};
const checkout = createRoute({
  getParentRoute: () => root,
  path: "/pagamento",
  component: Checkout,
  beforeLoad: protect,
});
const order = createRoute({
  getParentRoute: () => root,
  path: "/pedido/$id",
  component: OrderPage,
  beforeLoad: protect,
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/perfil",
  component: Profile,
  beforeLoad: protect,
});
const wallets = createRoute({
  getParentRoute: () => root,
  path: "/carteiras",
  component: Wallets,
  beforeLoad: protect,
});
const favorites = createRoute({
  getParentRoute: () => root,
  path: "/favoritos",
  component: Favorites,
  beforeLoad: protect,
});
const orders = createRoute({
  getParentRoute: () => root,
  path: "/pedidos",
  component: Orders,
  beforeLoad: protect,
});
export const router = createRouter({
  routeTree: root.addChildren([
    index,
    detail,
    cart,
    login,
    register,
    checkout,
    order,
    profile,
    wallets,
    favorites,
    orders,
  ]),
  defaultPreload: "intent",
  defaultPendingComponent: () => (
    <p className="empty" role="status">
      Carregando…
    </p>
  ),
  defaultErrorComponent: ({ error, reset }) => (
    <div className="empty" role="alert">
      <h1>Não foi possível abrir esta tela</h1>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <button onClick={reset}>Tentar novamente</button>
    </div>
  ),
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
