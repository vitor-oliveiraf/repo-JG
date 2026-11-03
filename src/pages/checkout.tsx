import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { api } from "../lib/api";
import { useQuote, useSession } from "../lib/data";
import { eth, type Quote, type Order, type Wallet } from "../domain";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import {
  Empty,
  ErrorBox,
  Field,
  SelectField,
  Skeleton,
} from "../components/common";
import { Summary } from "./cart";
interface Attempt {
  key: string;
  body: {
    quoteId: string;
    walletId: string;
    network: string;
    collector: Record<string, string>;
  };
}
export function Checkout() {
  const session = useSession();
  const user = session.data;
  const userId = user?.id || "guest";
  const quote = useQuote();
  const client = useQueryClient();
  const navigate = useNavigate();
  const sending = useRef(false);
  const wallets = useQuery({
    queryKey: ["wallets", userId],
    enabled: !!user,
    queryFn: async ({ signal }) =>
      (await api.get<Wallet[]>("/wallets", { signal })).data,
  });
  const [walletId, setWalletId] = useState("");
  const [connected, setConnected] = useState("");
  const [review, setReview] = useState<{
    quote: Quote;
    collector: Record<string, string>;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const attemptKey = `kurio.attempt.${userId}`;
  const [attempt, setAttempt] = useState<Attempt | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(attemptKey) || "null");
    } catch {
      return null;
    }
  });
  const selected =
    wallets.data?.find((w) => w.id === walletId) ||
    wallets.data?.find((w) => w.primary) ||
    wallets.data?.[0];
  const connect = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Cadastre uma carteira primeiro.");
      await api.post(`/wallets/${selected.id}/connect`);
      return selected.id;
    },
    onSuccess: (id) => setConnected(id),
  });
  const submit = useMutation({
    mutationFn: async (saved: Attempt) =>
      (
        await api.post<Order>("/orders", saved.body, {
          headers: { "Idempotency-Key": saved.key },
        })
      ).data,
    onSuccess: (order) => {
      client.setQueryData(["order", order.id, userId], order);
      void navigate({ to: "/pedido/$id", params: { id: order.id } });
    },
    onError: async (error) => {
      if (
        (error as { response?: { status: number; data?: { code: string } } })
          .response?.data?.code === "QUOTE_CHANGED"
      ) {
        localStorage.removeItem(attemptKey);
        sending.current = false;
        setAttempt(null);
        setReview(null);
        setNotice(
          "A cotação mudou. Revise os valores atualizados antes de confirmar novamente.",
        );
        await quote.refetch();
      }
    },
  });
  const prepare = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      if (!selected || connected !== selected.id)
        throw new Error("Conecte a carteira selecionada antes de revisar.");
      const collector = Object.fromEntries(
        new FormData(form).entries(),
      ) as Record<string, string>;
      const current = (await api.get<Quote>("/quote")).data;
      client.setQueryData(["quote", userId], current);
      if (!current.valid)
        throw new Error(current.issues.join(" ") || "O carrinho está vazio.");
      if (current.id !== quote.data?.id)
        setNotice("Os valores foram atualizados. Revise a nova cotação.");
      setReview({ quote: current, collector });
    },
  });
  if (!user || quote.isPending || wallets.isPending)
    return <Skeleton kind="detail" />;
  if (quote.isError || wallets.isError)
    return (
      <ErrorBox
        error={quote.error || wallets.error}
        retry={() => {
          void quote.refetch();
          void wallets.refetch();
        }}
      />
    );
  if (attempt)
    return (
      <section className="page-section">
        <h1>Recuperar tentativa de compra</h1>
        <p>
          Uma compra já foi enviada. Vamos consultar a mesma tentativa, usando
          sua chave de idempotência.
        </p>
        <p className="muted">
          Nenhum novo pedido será criado para esta tentativa.
        </p>
        <Button
          disabled={submit.isPending}
          onClick={() => submit.mutate(attempt)}
        >
          {submit.isPending ? "Recuperando…" : "Recuperar pedido"}
        </Button>
        {submit.isError && <ErrorBox error={submit.error} />}
      </section>
    );
  if (!quote.data.lines.length)
    return (
      <Empty>
        <h1>Seu carrinho está vazio</h1>
        <Button asChild>
          <Link to="/">Explorar NFTs</Link>
        </Button>
      </Empty>
    );
  return (
    <>
      <div className="breadcrumbs">
        <Link to="/">Início</Link> / Mercado / Pagamento
      </div>
      <h1 className="mobile-page-title">Pagamento</h1>
      {notice && (
        <p role="alert" className="error-box">
          {notice}
        </p>
      )}
      <section className="checkout-layout">
        <form
          id="checkout-form"
          onSubmit={(e) => {
            e.preventDefault();
            prepare.mutate(e.currentTarget);
          }}
        >
          <h2>Perfil do colecionador</h2>
          <div className="form-grid">
            <Field
              label="Nome de exibição"
              name="name"
              defaultValue={user.name}
              required
              autoComplete="name"
            />
            <Field
              label="Nome de usuário"
              name="username"
              defaultValue={user.username}
              required
            />
            <SelectField
              label="Rede"
              value={selected?.network || ""}
              onChange={(network) => {
                setWalletId(
                  wallets.data.find((w) => w.network === network)?.id || "",
                );
                setConnected("");
              }}
              required
            >
              <option value="" disabled>
                Selecione uma rede
              </option>
              {[...new Set(wallets.data.map((w) => w.network))].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </SelectField>
            <Field
              label="Nome do perfil"
              name="profileName"
              defaultValue={user.name}
              required
            />
            <Field
              label="Endereço da carteira"
              value={selected?.address || ""}
              readOnly
              required
            />
            <Field
              label="ENS ou carteira secundária (opcional)"
              name="secondary"
            />
            <Field
              label="Tipo de carteira"
              value={selected?.provider || ""}
              readOnly
              required
            />
            <Field
              label="Código de indicação"
              name="referral"
              defaultValue="KURIO"
              required
            />
            <Field
              label="E-mail"
              name="email"
              type="email"
              defaultValue={user.email}
              required
              autoComplete="email"
            />
            <Field
              label="Nome ENS"
              name="ens"
              defaultValue={user.ens}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="collector-note">
              Observação do colecionador (opcional)
            </label>
            <textarea id="collector-note" name="note" rows={5} />
          </div>
          {prepare.isError && <ErrorBox error={prepare.error} />}
        </form>
        <aside className="checkout-summary">
          <h2>Seus NFTs</h2>
          <div className="receipt-lines">
            {quote.data.lines.map((line) => (
              <div key={`${line.nftId}:${line.edition}`}>
                <img src={line.image} alt="" width="70" height="70" />
                <div>
                  <strong>{line.name}</strong>
                  <p className="muted">
                    {line.edition} (x {line.quantity})
                  </p>
                </div>
                <strong className="accent">{eth(line.total)}</strong>
              </div>
            ))}
          </div>
          <Summary quote={quote.data} />
          <fieldset className="wallet-options">
            <legend>Carteira e rede</legend>
            {wallets.data.length ? (
              wallets.data.map((w) => (
                <label key={w.id}>
                  <input
                    type="radio"
                    name="wallet"
                    value={w.id}
                    checked={selected?.id === w.id}
                    onChange={() => {
                      setWalletId(w.id);
                      setConnected("");
                    }}
                  />
                  <span>
                    {w.nickname}
                    <small>
                      {w.provider} · {w.network}
                    </small>
                  </span>
                </label>
              ))
            ) : (
              <p>
                <Link to="/carteiras">
                  Cadastre uma carteira para continuar →
                </Link>
              </p>
            )}
          </fieldset>
          {connected === selected?.id ? (
            <p role="status" className="success">
              Carteira conectada{" "}
              <button onClick={() => setConnected("")}>Desconectar</button>
            </p>
          ) : (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => connect.mutate()}
              disabled={connect.isPending || !selected}
            >
              {connect.isPending ? "Conectando…" : "Conectar carteira simulada"}
            </Button>
          )}
          {connect.isError && <ErrorBox error={connect.error} />}
          <Button
            className="w-full mt-4"
            type="submit"
            form="checkout-form"
            disabled={
              prepare.isPending ||
              connected !== selected?.id ||
              !quote.data.valid
            }
          >
            {prepare.isPending ? "Revalidando…" : "Revisar compra"}
          </Button>
          {quote.data.issues.map((issue) => (
            <p key={issue} role="alert" className="error">
              {issue}
            </p>
          ))}
        </aside>
      </section>
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!submit.isPending && !open) setReview(null);
        }}
        title="Revise antes de confirmar"
        description="Compra simulada. Nenhuma transação real será realizada."
      >
        {review && (
          <>
            <p>
              {review.collector.name} · {selected?.provider}
            </p>
            <Summary quote={review.quote} />
            <Button
              className="w-full"
              disabled={submit.isPending}
              onClick={() => {
                if (!selected || sending.current) return;
                sending.current = true;
                const saved: Attempt = {
                  key: crypto.randomUUID(),
                  body: {
                    quoteId: review.quote.id,
                    walletId: selected.id,
                    network: selected.network,
                    collector: review.collector,
                  },
                };
                localStorage.setItem(attemptKey, JSON.stringify(saved));
                setAttempt(saved);
                submit.mutate(saved);
              }}
            >
              {submit.isPending ? "Enviando pedido…" : "Confirmar compra"}
            </Button>
          </>
        )}
        {submit.isError && <ErrorBox error={submit.error} />}
      </Dialog>
    </>
  );
}
export function OrderPage() {
  const { id } = useParams({ from: "/pedido/$id" });
  const { data: user } = useSession();
  const query = useQuery({
    queryKey: ["order", id, user?.id],
    queryFn: async ({ signal }) =>
      (await api.get<Order>(`/orders/${id}`, { signal })).data,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1500 : false,
  });
  if (query.isPending) return <Skeleton kind="summary" />;
  if (query.isError)
    return <ErrorBox error={query.error} retry={() => void query.refetch()} />;
  const order = query.data;
  if (order.status !== "pending")
    localStorage.removeItem(`kurio.attempt.${user?.id}`);
  return (
    <section className="order-page">
      <div className="order-status" role="status">
        {order.status === "confirmed" ? (
          <CheckCircle2 size={52} />
        ) : order.status === "refused" ? (
          <XCircle size={52} />
        ) : (
          <Clock size={52} />
        )}
        <h1>
          {order.status === "confirmed"
            ? "Sua coleção acaba de crescer."
            : order.status === "refused"
              ? "Pagamento recusado"
              : "Seu pedido está em processamento"}
        </h1>
        <p>
          {order.status === "confirmed"
            ? "Compra confirmada pela simulação."
            : order.status === "refused"
              ? "Nenhum item foi removido do seu carrinho."
              : "Você pode atualizar a página. O estado desta compra será recuperado."}
        </p>
      </div>
      <p className="muted order-id">Pedido: {order.id}</p>
      <div className="receipt">
        <h2>
          {order.status === "confirmed"
            ? "Recibo da compra"
            : "Resumo do pedido"}
        </h2>
        {order.quote.lines.map((l) => (
          <div className="receipt-item" key={`${l.nftId}:${l.edition}`}>
            <img src={l.image} alt={l.name} width="80" height="80" />
            <span>
              {l.name}
              <small>
                {l.edition} · {l.quantity} edição(ões)
              </small>
            </span>
            <strong>{eth(l.total)}</strong>
          </div>
        ))}
        <Summary quote={order.quote} />
        <p>
          Carteira: {order.wallet.nickname} · {order.wallet.network}
        </p>
        {order.status === "confirmed" && (
          <>
            <h3>Transação simulada</h3>
            <p className="transaction">{order.transaction}</p>
            <p className="muted">
              Referência fictícia; não possui registro em explorador de
              blockchain.
            </p>
          </>
        )}
        <p className="muted">
          {new Date(order.createdAt).toLocaleString("pt-BR")}
        </p>
      </div>
      <div className="order-actions">
        <Button asChild>
          <Link to={order.status === "refused" ? "/carrinho" : "/"}>
            {order.status === "refused"
              ? "Voltar ao carrinho"
              : "Continuar explorando"}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/pedidos">Meus pedidos</Link>
        </Button>
      </div>
    </section>
  );
}
