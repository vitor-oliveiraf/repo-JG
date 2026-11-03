import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fields } from "../lib/api";
import { useSession, useFavorites, useNft } from "../lib/data";
import { AccountNav } from "../components/layout";
import { Button } from "../components/ui/button";
import {
  Field,
  ErrorBox,
  Skeleton,
  SelectField,
  Empty,
} from "../components/common";
import { NftCard } from "./catalog";
import {
  eth,
  type User,
  type Wallet,
  type Network,
  type Order,
} from "../domain";
function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <section className="account-layout">
      <AccountNav />
      <div className="account-content">{children}</div>
    </section>
  );
}
export function Profile() {
  const { data: user } = useSession();
  const client = useQueryClient();
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [imageError, setImageError] = useState("");
  const [success, setSuccess] = useState("");
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const data = Object.fromEntries(form.entries());
      if (data.password && data.password !== data.confirm)
        throw new Error("As novas senhas não coincidem.");
      if (data.password)
        await api.put("/profile/password", {
          current: data.current,
          password: data.password,
        });
      return (
        await api.put<User>("/profile", {
          name: data.name,
          username: data.username,
          email: data.email,
          ens: data.ens,
          nickname: data.nickname,
          avatar,
        })
      ).data;
    },
    onSuccess: (data) => {
      client.setQueryData(["session"], data);
      client.setQueryData(["profile", data.id], data);
      setSuccess("Perfil salvo com sucesso.");
    },
  });
  const errs = fields(mutation.error);
  return (
    <AccountLayout>
      <h1>Perfil do colecionador</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSuccess("");
          mutation.mutate(new FormData(e.currentTarget));
        }}
      >
        <div className="form-grid">
          <Field
            label="Nome de exibição"
            name="name"
            defaultValue={user?.name}
            required
            error={errs?.name}
          />
          <Field
            label="Nome de usuário"
            name="username"
            defaultValue={user?.username}
            required
            error={errs?.username}
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            defaultValue={user?.email}
            required
            error={errs?.email}
          />
          <Field
            label="Nome ENS"
            name="ens"
            defaultValue={user?.ens}
            required
          />
          <Field
            label="Apelido da carteira"
            name="nickname"
            defaultValue={user?.nickname}
            required
          />
          <div className="field">
            <label htmlFor="avatar">Avatar</label>
            <div className="avatar-controls">
              {avatar ? (
                <img src={avatar} alt="Seu avatar" width="48" height="48" />
              ) : (
                <span className="avatar-placeholder">☺</span>
              )}
              <label className="upload-button" htmlFor="avatar">
                Alterar
              </label>
              <input
                className="sr-only"
                id="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    file.size > 500000 ||
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      file.type,
                    )
                  ) {
                    setImageError("Use PNG, JPEG ou WebP de até 500 KB.");
                    return;
                  }
                  setImageError("");
                  const reader = new FileReader();
                  reader.onload = () => setAvatar(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
              <button type="button" onClick={() => setAvatar("")}>
                Remover
              </button>
            </div>
            {imageError && (
              <small role="alert" className="error">
                {imageError}
              </small>
            )}
          </div>
        </div>
        <div className="password-form">
          <h2>Alterar senha</h2>
          <Field
            label="Senha atual"
            name="current"
            type="password"
            autoComplete="current-password"
            error={errs?.current}
          />
          <Field
            label="Nova senha"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            error={errs?.password}
          />
          <Field
            label="Confirmar nova senha"
            name="confirm"
            type="password"
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {mutation.isError && <ErrorBox error={mutation.error} />}{" "}
        {success && (
          <p role="status" className="success">
            {success}
          </p>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </AccountLayout>
  );
}
export function Wallets() {
  const { data: user } = useSession();
  const query = useQuery({
    queryKey: ["wallets", user?.id],
    enabled: !!user,
    queryFn: async ({ signal }) =>
      (await api.get<Wallet[]>("/wallets", { signal })).data,
  });
  return (
    <AccountLayout>
      <h1>Carteiras</h1>
      <p className="muted">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs
        comprados.
      </p>
      {query.isPending ? (
        <Skeleton kind="summary" />
      ) : query.isError ? (
        <ErrorBox error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          <WalletForm
            key={query.data.find((w) => w.primary)?.id || "primary"}
            initial={query.data.find((w) => w.primary)}
            primary
          />
          <WalletForm
            key={query.data.find((w) => !w.primary)?.id || "secondary"}
            initial={query.data.find((w) => !w.primary)}
            primary={false}
          />
        </>
      )}
    </AccountLayout>
  );
}
function WalletForm({
  initial,
  primary,
}: {
  initial?: Wallet;
  primary: boolean;
}) {
  const { data: user } = useSession();
  const client = useQueryClient();
  const [network, setNetwork] = useState<Network>(
    initial?.network || "Ethereum",
  );
  const [provider, setProvider] = useState(initial?.provider || "MetaMask");
  const [editing, setEditing] = useState(primary || !!initial);
  const [success, setSuccess] = useState("");
  const mutation = useMutation({
    mutationFn: async (form: FormData) =>
      (
        await api.put<Wallet>("/wallets", {
          ...Object.fromEntries(form.entries()),
          id: initial?.id,
          primary,
          network,
          provider,
        })
      ).data,
    onSuccess: async () => {
      setSuccess("Carteira salva com sucesso.");
      await client.invalidateQueries({ queryKey: ["wallets", user?.id] });
    },
  });
  const errs = fields(mutation.error);
  return (
    <section className="wallet-form">
      <div className="section-heading">
        <h2>Carteira {primary ? "principal" : "secundária"}</h2>
        <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
          {editing ? "Recolher" : "Adicionar"}
        </Button>
      </div>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSuccess("");
            mutation.mutate(new FormData(e.currentTarget));
          }}
        >
          <div className="form-grid">
            <Field
              label="Nome de exibição"
              name="name"
              defaultValue={initial?.name || user?.name}
              required
            />
            <Field
              label="Apelido da carteira"
              name="nickname"
              defaultValue={initial?.nickname || ""}
              required
              error={errs?.nickname}
            />
            <SelectField
              label="Rede"
              value={network}
              onChange={(n) => setNetwork(n as Network)}
              required
            >
              {["Ethereum", "Polygon", "Solana"].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </SelectField>
            <Field
              label="Nome do perfil"
              name="profileName"
              defaultValue={initial?.profileName || user?.username}
              required
            />
            <Field
              label="Endereço da carteira"
              name="address"
              placeholder="Endereço da carteira"
              defaultValue={initial?.address}
              required
              error={errs?.address}
            />
            <Field
              label="ENS ou carteira secundária (opcional)"
              name="secondary"
              defaultValue={initial?.secondary}
            />
            <SelectField
              label="Tipo de carteira"
              value={provider}
              onChange={setProvider}
              required
            >
              {["MetaMask", "WalletConnect", "Coinbase Wallet"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </SelectField>
            <Field
              label="Código de indicação"
              name="referral"
              defaultValue={initial?.referral || "KURIO"}
              required
            />
            <Field
              label="E-mail"
              name="email"
              type="email"
              defaultValue={initial?.email || user?.email}
              required
            />
            <Field
              label="Nome ENS"
              name="ens"
              defaultValue={initial?.ens || user?.ens}
              required
            />
          </div>
          {mutation.isError && <ErrorBox error={mutation.error} />}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando…" : "Salvar carteira"}
          </Button>
        </form>
      ) : (
        <p className="muted">
          {initial
            ? initial.nickname
            : "Você ainda não adicionou uma carteira secundária."}
        </p>
      )}
      {success && (
        <p role="status" className="success">
          {success}
        </p>
      )}
    </section>
  );
}
function FavoriteCard({ id }: { id: string }) {
  const query = useNft(id);
  return query.data ? (
    <NftCard nft={query.data} />
  ) : query.isPending ? (
    <Skeleton kind="summary" />
  ) : null;
}
export function Favorites() {
  const query = useFavorites();
  return (
    <AccountLayout>
      <h1>Lista de interesse</h1>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorBox error={query.error} retry={() => void query.refetch()} />
      ) : query.data?.length ? (
        <div className="nft-grid">
          {query.data.map((id) => (
            <FavoriteCard key={id} id={id} />
          ))}
        </div>
      ) : (
        <Empty>
          <p>Você ainda não favoritou nenhum NFT.</p>
          <Link to="/">Explorar coleções →</Link>
        </Empty>
      )}
    </AccountLayout>
  );
}
export function Orders() {
  const { data: user } = useSession();
  const query = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async ({ signal }) =>
      (await api.get<Order[]>("/orders", { signal })).data,
  });
  return (
    <AccountLayout>
      <h1>Meus pedidos</h1>
      {query.isPending ? (
        <Skeleton kind="summary" />
      ) : query.isError ? (
        <ErrorBox error={query.error} retry={() => void query.refetch()} />
      ) : query.data.length ? (
        query.data.map((o) => (
          <Link
            key={o.id}
            className="order-list-item"
            to="/pedido/$id"
            params={{ id: o.id }}
          >
            <span>
              Pedido {o.id.slice(0, 8)}
              <small>{new Date(o.createdAt).toLocaleString("pt-BR")}</small>
            </span>
            <strong>{eth(o.quote.total)}</strong>
            <span>
              {o.status === "pending"
                ? "Pendente"
                : o.status === "confirmed"
                  ? "Confirmado"
                  : "Recusado"}{" "}
              →
            </span>
          </Link>
        ))
      ) : (
        <Empty>Você ainda não fez nenhuma compra.</Empty>
      )}
    </AccountLayout>
  );
}
