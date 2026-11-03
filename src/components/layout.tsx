import { useEffect, useState } from "react";
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  Search,
  ShoppingCart,
  UserRound,
  Heart,
  House,
  LogIn,
  LogOut,
  SlidersHorizontal,
  Radio,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCart, useSession } from "../lib/data";
import { api, logout, queryClient } from "../lib/api";
import { useRealtime } from "../lib/realtime";
import { Button } from "./ui/button";
import { Dialog } from "./dialog";
import { ErrorBox } from "./common";
export function Layout() {
  const { data: user } = useSession();
  const { data: cart } = useCart();
  const navigate = useNavigate();
  const route = useRouterState({ select: (s) => s.location });
  const market =
    route.pathname.startsWith("/nft/") ||
    route.pathname.startsWith("/pedido/") ||
    ["/carrinho", "/pagamento"].includes(route.pathname) ||
    route.searchStr.includes("market=true");
  const live = useRealtime();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const expired = () => {
      void queryClient.cancelQueries();
      queryClient.clear();
      queryClient.setQueryData(["session"], null);
      if (!["/login", "/cadastro"].includes(location.pathname))
        void navigate({
          to: "/login",
          search: { redirect: location.pathname + location.search },
        });
    };
    window.addEventListener("kurio:expired", expired);
    return () => window.removeEventListener("kurio:expired", expired);
  }, [navigate]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.pathname]);
  return (
    <>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <div
        className="site-container"
        data-route={route.pathname}
        data-market={market}
      >
        <header className="header">
          <Link to="/" className="wordmark" aria-label="Kurio início">
            KURIO
          </Link>
          <nav className="desktop-nav" aria-label="Principal">
            <Link
              to="/"
              className={!market ? "nav-active" : ""}
              activeOptions={{ exact: true }}
            >
              Início
            </Link>
            <Link
              to="/"
              className={market ? "nav-active" : ""}
              search={{ market: true }}
            >
              Mercado
            </Link>
            <button onClick={() => setSearchOpen(true)}>Criadores</button>
            <a href="#footer">Aprenda</a>
          </nav>
          <div className="header-actions">
            <button
              aria-label="Buscar NFTs"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={22} />
            </button>
            <Link
              to="/carrinho"
              aria-label={`Carrinho, ${cart?.items.reduce((s, i) => s + i.quantity, 0) || 0} itens`}
              className="cart-link"
            >
              <ShoppingCart size={23} />
              <span>
                {cart?.items.reduce((s, i) => s + i.quantity, 0) || 0}
              </span>
            </Link>
            {user ? (
              <Link to="/perfil" className="account-link">
                <UserRound size={18} />
                <span>{user.username}</span>
              </Link>
            ) : (
              <Button size="sm" asChild>
                <Link to="/login">
                  <LogIn size={15} />
                  Entrar
                </Link>
              </Button>
            )}
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
        {![
          "/perfil",
          "/carteiras",
          "/favoritos",
          "/pedidos",
          "/pedido/",
          "/login",
          "/cadastro",
        ].some((p) => route.pathname.startsWith(p)) && <Footer />}
      </div>
      {(route.pathname === "/" ||
        ["/perfil", "/carteiras", "/favoritos", "/pedidos"].includes(
          route.pathname,
        )) && (
        <nav className="mobile-nav" aria-label="Navegação mobile">
          <Link to="/" aria-label="Início">
            <House />
          </Link>
          <Link to="/favoritos" aria-label="Favoritos">
            <Heart />
          </Link>
          <Link
            to="/"
            search={{ market: true }}
            className="mobile-center"
            aria-label="Explorar NFTs"
          >
            <SlidersHorizontal />
          </Link>
          <Link to="/carrinho" aria-label="Carrinho">
            <ShoppingCart />
          </Link>
          <Link to="/perfil" aria-label="Perfil">
            <UserRound />
          </Link>
        </nav>
      )}
      {live.notice && (
        <div className="live-notice" role="status">
          {live.notice}
          <button
            aria-label="Dispensar aviso"
            onClick={() => live.setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      <div className="connection" title="Status Socket.IO">
        <Radio size={12} />
        {live.state}
      </div>
      <DemoPanel />
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Explorar coleções"
        description="Busque pelo nome de um NFT ou criador."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ to: "/", search: { q: search, page: 1 } });
            setSearchOpen(false);
          }}
        >
          <label htmlFor="global-search" className="sr-only">
            Buscar NFTs
          </label>
          <input
            id="global-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar NFTs…"
            autoFocus
          />
          <Button type="submit" className="mt-4">
            Buscar
          </Button>
        </form>
      </Dialog>
    </>
  );
}
function Footer() {
  const [info, setInfo] = useState("");
  return (
    <footer id="footer">
      <div className="footer-features">
        {[
          [
            "W",
            "Segurança da carteira",
            "Proteja sua carteira e colecione arte digital verificada com confiança.",
          ],
          [
            "C",
            "Criadores em destaque",
            "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
          ],
          [
            "D",
            "Alertas de lançamentos",
            "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
          ],
        ].map(([letter, title, text]) => (
          <div key={letter}>
            <span className="medallion">{letter}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
        <div>
          <h3>Antecipe-se ao próximo lançamento</h3>
          <form
            className="newsletter"
            onSubmit={(e) => {
              e.preventDefault();
              setInfo(
                "Newsletter indisponível nesta demonstração. Nenhuma inscrição foi enviada.",
              );
            }}
          >
            <label htmlFor="newsletter-email" className="sr-only">
              E-mail para novidades
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="digite seu e-mail…"
              required
            />
            <Button type="submit">Enviar</Button>
          </form>
          <p>
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
        </div>
      </div>
      <div className="footer-band">
        <strong className="wordmark">KURIO</strong>
        <span>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </span>
        <a href="mailto:contato@email.com">contato@email.com</a>
        <span>+55 11 4002 8922</span>
      </div>
      <div className="footer-links">
        <div>
          <h3>Meu perfil</h3>
          <Link to="/perfil">Meu perfil</Link>
          <Link to="/carteiras">Carteiras</Link>
          <Link to="/pedidos">Meus pedidos</Link>
          <Link to="/favoritos">Lista de interesse</Link>
          <button
            onClick={() =>
              setInfo(
                "Estúdio do criador: recurso fora do escopo desta demonstração.",
              )
            }
          >
            Estúdio do criador
          </button>
        </div>
        <div>
          <h3>Central de ajuda</h3>
          {[
            "Como comprar NFTs",
            "Carteira e segurança",
            "Política do mercado",
            "Denunciar item",
          ].map((t) => (
            <button
              key={t}
              onClick={() =>
                setInfo(`${t}: conteúdo fora do escopo desta demonstração.`)
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div>
          <h3>Coleções</h3>
          {["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"].map(
            (t) => (
              <Link key={t} to="/" search={{ category: t }}>
                {t}
              </Link>
            ),
          )}
        </div>
        <div>
          <h3>Redes sociais</h3>
          <div className="social-links">
            {[
              ["facebook", "Facebook"],
              ["instagram", "Instagram"],
              ["twitter", "Twitter"],
              ["linkedin", "LinkedIn"],
              ["youtube", "YouTube"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-label={label}
                onClick={() =>
                  setInfo(
                    `${label}: perfil externo indisponível nesta demonstração.`,
                  )
                }
              >
                <img src={`/assets/social-${id}.svg`} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <h3>Carteiras compatíveis</h3>
          <small className="wallet-chip">
            METAMASK · WALLETCONNECT · COINBASE
          </small>
        </div>
      </div>
      <p className="copyright">© 2026 Kurio. Propriedade digital para todos.</p>
      <Dialog
        open={!!info}
        onOpenChange={() => setInfo("")}
        title="Sobre esta demonstração"
      >
        <p>{info}</p>
      </Dialog>
    </footer>
  );
}
export function AccountNav() {
  const navigate = useNavigate();
  const [info, setInfo] = useState("");
  return (
    <aside className="account-nav">
      <h2>Meu perfil</h2>
      <Link to="/perfil">
        <UserRound size={16} />
        Dados do perfil
      </Link>
      <Link to="/carteiras">◇ Carteiras</Link>
      <Link to="/pedidos">
        <ShoppingCart size={16} />
        Meus pedidos
      </Link>
      <Link to="/favoritos">
        <Heart size={16} />
        Lista de interesse
      </Link>
      {["Ofertas", "Arquivos baixados", "Suporte"].map((t) => (
        <button
          key={t}
          onClick={() => setInfo(`${t} não faz parte desta demonstração.`)}
        >
          {t}
        </button>
      ))}
      <button
        onClick={async () => {
          await logout();
          void navigate({ to: "/" });
        }}
      >
        <LogOut size={16} />
        Sair
      </button>
      <Dialog
        open={!!info}
        onOpenChange={() => setInfo("")}
        title="Recurso indisponível"
      >
        <p>{info}</p>
      </Dialog>
    </aside>
  );
}
function DemoPanel() {
  const [open, setOpen] = useState(false);
  const state = useQuery({
    queryKey: ["demo"],
    enabled: open,
    queryFn: async () =>
      (await api.get<{ scenario: string; scenarios: string[] }>("/demo")).data,
  });
  const mutation = useMutation({
    mutationFn: async (body: Record<string, string>) => api.post("/demo", body),
    onSuccess: async (_data, body) => {
      if (body.action === "reset") {
        localStorage.removeItem("kurio.token");
        Object.keys(localStorage)
          .filter((k) => k.startsWith("kurio.attempt."))
          .forEach((k) => localStorage.removeItem(k));
        location.assign("/");
      } else await queryClient.invalidateQueries({ queryKey: ["demo"] });
    },
  });
  return (
    <>
      <button className="demo-toggle" onClick={() => setOpen(true)}>
        Cenários
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Laboratório da demonstração"
        description="Cenários reproduzíveis da API e do Socket.IO. Credenciais: nova@kurio.test ou alex@kurio.test · Kurio123!"
      >
        <label htmlFor="scenario">Condição simulada</label>
        <select
          id="scenario"
          value={state.data?.scenario || "standard"}
          onChange={(e) =>
            mutation.mutate({ action: "scenario", scenario: e.target.value })
          }
        >
          {state.data?.scenarios.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div className="demo-buttons">
          {[
            ["price", "Alterar preço"],
            ["stock", "Esgotar edição"],
            ["duplicate", "Evento duplicado"],
            ["old", "Evento antigo"],
            ["disconnect", "Interromper Socket.IO"],
            ["expire", "Expirar sessão"],
          ].map(([action, label]) => (
            <Button
              key={action}
              variant="outline"
              onClick={() => mutation.mutate({ action })}
            >
              {label}
            </Button>
          ))}
          <Button
            onClick={() =>
              mutation.mutate({ action: "reset", scenario: "standard" })
            }
          >
            Resetar todos os dados
          </Button>
        </div>
        {mutation.isError && <ErrorBox error={mutation.error} />}
      </Dialog>
    </>
  );
}
