import { useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Heart, ArrowLeft, Star, ShoppingCart } from "lucide-react";
import {
  useNft,
  useCartMutation,
  useFavorites,
  useFavoriteMutation,
  useOwner,
} from "../lib/data";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { ErrorBox, Quantity, Skeleton } from "../components/common";
import { Related } from "./catalog";
import { eth, type Edition } from "../domain";
export function Detail() {
  const { id } = useParams({ from: "/nft/$id" });
  const query = useNft(id);
  const add = useCartMutation();
  const favorites = useFavorites();
  const favorite = useFavoriteMutation();
  const owner = useOwner();
  const navigate = useNavigate();
  const [edition, setEdition] = useState<Edition>("1/50");
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState(false);
  const [tab, setTab] = useState("details");
  const [added, setAdded] = useState(false);
  if (query.isPending)
    return (
      <>
        <div className="breadcrumbs">Início / Mercado</div>
        <Skeleton kind="detail" />
        <div className="detail-description">
          <Skeleton kind="summary" />
        </div>
        <div className="related">
          <Skeleton />
        </div>
      </>
    );
  if (query.isError)
    return (
      <div className="page-section">
        <ErrorBox error={query.error} retry={() => void query.refetch()} />
        <Link to="/">Voltar ao mercado</Link>
      </div>
    );
  const nft = query.data;
  const active = favorites.data?.includes(id) || false;
  const toggleFavorite = () => {
    if (owner === "guest") {
      void navigate({ to: "/login", search: { redirect: `/nft/${id}` } });
      return;
    }
    favorite.mutate({ id, active: !active });
  };
  return (
    <>
      <div className="breadcrumbs">
        <Link to="/">Início</Link> / Mercado
      </div>
      <div className="mobile-detail-top">
        <Link to="/" aria-label="Voltar">
          <ArrowLeft />
        </Link>
        <button
          onClick={toggleFavorite}
          aria-label="Favoritar NFT"
          aria-pressed={active}
        >
          <Heart fill={active ? "currentColor" : "none"} />
        </button>
      </div>
      <section className="detail-grid">
        <div className="gallery">
          <div className="thumbnails">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => setZoom(true)}
                aria-label={`Ampliar imagem ${i + 1}`}
              >
                <img src={nft.image} width="100" height="100" alt="" />
              </button>
            ))}
          </div>
          <button
            className="main-art"
            onClick={() => setZoom(true)}
            aria-label="Ampliar arte"
          >
            <img
              src={nft.image}
              alt={nft.name}
              width="500"
              height="500"
              fetchPriority="high"
            />
          </button>
        </div>
        <div className="detail-info">
          <h1>{nft.name}</h1>
          <div className="detail-price">
            <strong className="price">{eth(nft.price)}</strong>
            <span>
              <Star size={15} fill="currentColor" /> 4.8 (19 avaliações)
            </span>
          </div>
          <h2>Sobre este NFT:</h2>
          <p className="muted">
            Um colecionável digital finalizado à mão da coleção Kurio Editions,
            verificado na {nft.network}, com arte desbloqueável e acesso para
            colecionadores.
          </p>
          <fieldset className="editions">
            <legend>Edição:</legend>
            {(Object.keys(nft.editions) as Edition[]).map((e) => (
              <button
                key={e}
                disabled={nft.editions[e] === 0}
                onClick={() => {
                  setEdition(e);
                  setQuantity(1);
                  setAdded(false);
                }}
                aria-pressed={e === edition}
              >
                {e}
              </button>
            ))}
          </fieldset>
          <div className="buy-row">
            <Quantity
              value={quantity}
              max={nft.editions[edition]}
              onChange={(n) => {
                setQuantity(n);
                setAdded(false);
              }}
              disabled={add.isPending}
            />
            <Button
              disabled={
                add.isPending ||
                quantity > nft.editions[edition] ||
                !nft.editions[edition]
              }
              onClick={() =>
                add.mutate(
                  { nftId: id, edition, quantity, mode: "add" },
                  {
                    onSuccess: () => {
                      setAdded(true);
                    },
                  },
                )
              }
            >
              <ShoppingCart size={16} />
              {add.isPending ? "Adicionando…" : "COMPRAR"}
            </Button>
            <Button
              variant="outline"
              onClick={toggleFavorite}
              disabled={favorite.isPending}
            >
              <Heart size={17} fill={active ? "currentColor" : "none"} />
              Favoritar
            </Button>
          </div>
          {quantity > nft.editions[edition] && (
            <p role="alert">Esta quantidade não está mais disponível.</p>
          )}
          {added && (
            <p role="status" className="success">
              NFT adicionado. <Link to="/carrinho">Ver carrinho →</Link>
            </p>
          )}
          {add.isError && <ErrorBox error={add.error} />}{" "}
          {favorite.isError && <ErrorBox error={favorite.error} />}
          <p className="muted">
            ID do token: #
            {id === "emerald-ape-042"
              ? "0042"
              : id.replace("nft-", "").padStart(4, "0")}
          </p>
          <p className="muted">Coleção: {nft.collection}</p>
          <p className="muted">Atributos: Óculos, Esmeralda, Raro</p>
          <p>
            Rede: {nft.network} · {nft.editions[edition]} disponíveis
          </p>
        </div>
      </section>
      <section className="detail-description">
        <div className="tabs">
          <button
            aria-pressed={tab === "details"}
            onClick={() => setTab("details")}
          >
            Detalhes do NFT
          </button>
          <button
            aria-pressed={tab === "reviews"}
            onClick={() => setTab("reviews")}
          >
            Avaliações de colecionadores (19)
          </button>
        </div>
        {tab === "details" ? (
          <div className="muted">
            <p>
              {nft.name} é uma obra digital {edition} finalizada à mão da
              coleção Kurio Editions. Cada atributo fica armazenado nos
              metadados do token e verificado na {nft.network}. A obra explora
              identidade, movimento e luz em um mundo digital sem fronteiras.
            </p>
            <p>
              A propriedade inclui a arte em alta resolução, lançamentos
              exclusivos para colecionadores e um registro permanente de
              procedência registrada na rede.
            </p>
            <h3>Rede:</h3>
            <p>
              Cunhado na {nft.network} com procedência e metadados simulados.
            </p>
            <h3>Contrato:</h3>
            <p>0x7A42…19E8 · Referência fictícia para demonstração.</p>
            <h3>Direitos autorais:</h3>
            <p>5% nas vendas secundárias.</p>
          </div>
        ) : (
          <div className="empty">
            <Star className="accent" />
            <p>4.8 de 5 · 19 avaliações ilustrativas do layout.</p>
            <p className="muted">Publicação de avaliações fora do escopo.</p>
          </div>
        )}
      </section>
      <Related />
      <Dialog open={zoom} onOpenChange={setZoom} title={nft.name}>
        <img
          src={nft.image}
          width="500"
          height="500"
          alt={nft.name}
          className="zoom-art"
        />
      </Dialog>
    </>
  );
}
