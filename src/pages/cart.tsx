import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useCart, useCartMutation, useQuote, useOwner } from "../lib/data";
import { api } from "../lib/api";
import { decimal, units, eth, type Quote } from "../domain";
import { Button } from "../components/ui/button";
import {
  Empty,
  ErrorBox,
  Quantity,
  Skeleton,
  MobilePageHeader,
} from "../components/common";
import { Related } from "./catalog";
export function Summary({
  quote,
  compact = false,
}: {
  quote: Quote;
  compact?: boolean;
}) {
  return (
    <dl
      className={`summary-values ${compact ? "compact-summary" : ""} ${quote.discount !== "0" ? "has-discount" : ""}`}
    >
      <div>
        <dt>Subtotal</dt>
        <dd>{eth(quote.subtotal)}</dd>
      </div>
      <div>
        <dt>Desconto do lançamento</dt>
        <dd>− {eth(quote.discount)}</dd>
      </div>
      <div>
        <dt>Taxa de rede</dt>
        <dd>
          {eth(quote.fee)}
          <small className="accent">Taxa estimada na simulação</small>
        </dd>
      </div>
      <div className="summary-total">
        <dt>Total</dt>
        <dd>{eth(quote.total)}</dd>
      </div>
    </dl>
  );
}
export function Coupon() {
  const [coupon, setCoupon] = useState("");
  const quote = useQuote();
  const client = useQueryClient();
  const owner = useOwner();
  const mutation = useMutation({
    mutationFn: (code: string) =>
      api.put("/cart/coupon", { coupon: code.trim().toUpperCase() }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["cart", owner] }),
        client.invalidateQueries({ queryKey: ["quote", owner] }),
      ]);
    },
  });
  return (
    <div className="coupon">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(coupon);
        }}
      >
        <label htmlFor="coupon">Código promocional</label>
        <div className="input-group">
          <input
            id="coupon"
            placeholder="Digite o código promocional…"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
          />
          <Button size="sm" disabled={mutation.isPending} type="submit">
            Aplicar
          </Button>
        </div>
      </form>
      {quote.data?.coupon && (
        <p role="status">
          {quote.data.coupon} aplicado{" "}
          <button className="accent" onClick={() => mutation.mutate("")}>
            Remover
          </button>
        </p>
      )}
      {mutation.isError && <ErrorBox error={mutation.error} />}
    </div>
  );
}
export function CartPage() {
  const cart = useCart();
  const quote = useQuote();
  const mutation = useCartMutation();
  return (
    <>
      <div className="breadcrumbs">
        <Link to="/">Início</Link> / Mercado / Carrinho
      </div>
      <MobilePageHeader title="Carrinho de NFTs" />
      {cart.isPending || quote.isPending ? (
        <Skeleton kind="summary" />
      ) : cart.isError || quote.isError ? (
        <ErrorBox
          error={cart.error || quote.error}
          retry={() => {
            void cart.refetch();
            void quote.refetch();
          }}
        />
      ) : !quote.data.lines.length ? (
        <Empty>
          <h1>Seu carrinho está vazio</h1>
          <p>Encontre a próxima peça da sua coleção.</p>
          <Button asChild>
            <Link to="/">Explorar NFTs</Link>
          </Button>
        </Empty>
      ) : (
        <section className="cart-layout">
          <div>
            <div className="cart-table-header">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span />
            </div>
            <div className="cart-lines">
              {quote.data.lines.map((line) => (
                <article
                  className="cart-line"
                  key={`${line.nftId}:${line.edition}`}
                >
                  <Link
                    to="/nft/$id"
                    params={{ id: line.nftId }}
                    className="cart-nft"
                  >
                    <img
                      src={line.image}
                      alt={line.name}
                      width="70"
                      height="70"
                    />
                    <div>
                      <h2>{line.name}</h2>
                      <p className="muted">Edição: {line.edition}</p>
                    </div>
                  </Link>
                  <span>{eth(line.price)}</span>
                  <Quantity
                    value={line.quantity}
                    max={line.available}
                    disabled={mutation.isPending}
                    onChange={(quantity) =>
                      mutation.mutate({
                        nftId: line.nftId,
                        edition: line.edition,
                        quantity,
                      })
                    }
                  />
                  <strong className="accent">
                    {eth(decimal(units(line.price) * BigInt(line.quantity)))}
                  </strong>
                  <button
                    aria-label={`Remover ${line.name}`}
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ ...line, quantity: 0 })}
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>
            {mutation.isError && <ErrorBox error={mutation.error} />}{" "}
            {quote.data.issues.map((issue) => (
              <p className="error-box" role="alert" key={issue}>
                {issue}
              </p>
            ))}
          </div>
          <aside className="cart-summary">
            <h2>Resumo da carteira</h2>
            <Coupon />
            {quote.isFetching && (
              <p className="muted" role="status">
                Atualizando valores…
              </p>
            )}
            <Summary quote={quote.data} />
            <Button asChild className="w-full" disabled={!quote.data.valid}>
              <Link to="/pagamento">Conectar e finalizar</Link>
            </Button>
            <Link to="/" className="continue">
              Continuar explorando
            </Link>
          </aside>
        </section>
      )}
      <Related />
    </>
  );
}
