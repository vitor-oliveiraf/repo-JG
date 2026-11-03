import { useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { nftImageSources } from "../lib/images";
import { useFavorites, useFavoriteMutation, useOwner } from "../lib/data";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/dialog";
import { Empty, ErrorBox, Skeleton } from "../components/common";
import { eth, type Nft, type NftList } from "../domain";
const categories = [
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
export interface CatalogSearch {
  q?: string;
  category?: string;
  network?: string;
  min?: string;
  max?: string;
  sort?: string;
  tab?: string;
  page?: number;
  market?: boolean;
}
export function NftCard({ nft, index = 0 }: { nft: Nft; index?: number }) {
  const favorites = useFavorites();
  const favorite = useFavoriteMutation();
  const owner = useOwner();
  const navigate = useNavigate();
  const active = favorites.data?.includes(nft.id) || false;
  return (
    <article className="nft-card" data-nft={nft.id}>
      <div className="nft-art">
        <Link
          to="/nft/$id"
          params={{ id: nft.id }}
          aria-label={`Ver ${nft.name}`}
        >
          <img
            src={nft.image}
            srcSet={nftImageSources(nft.image)}
            sizes="(max-width:600px) calc((100vw - 66px)/2), (max-width:900px) 220px, 258px"
            alt={nft.name}
            width="250"
            height="250"
            loading={index < 3 ? "eager" : "lazy"}
            decoding="async"
          />
        </Link>
        <button
          className={`favorite ${active ? "selected" : ""}`}
          aria-label={`${active ? "Remover dos" : "Adicionar aos"} favoritos: ${nft.name}`}
          aria-pressed={active}
          disabled={favorite.isPending}
          onClick={() => {
            if (owner === "guest") {
              void navigate({
                to: "/login",
                search: { redirect: location.pathname + location.search },
              });
              return;
            }
            favorite.mutate({ id: nft.id, active: !active });
          }}
        >
          <Heart size={18} fill={active ? "currentColor" : "none"} />
        </button>
      </div>
      <Link to="/nft/$id" params={{ id: nft.id }} className="nft-name">
        {nft.name}
      </Link>
      <p className="price">
        {eth(nft.price)}
        {nft.originalPrice && <del>{eth(nft.originalPrice)}</del>}
      </p>
      {favorite.isError && <ErrorBox error={favorite.error} />}
    </article>
  );
}
export function Catalog() {
  const search = useSearch({ strict: false }) as CatalogSearch;
  const navigate = useNavigate();
  const [q, setQ] = useState(search.q || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [max, setMax] = useState(search.max || "12.30");
  const update = (patch: CatalogSearch) =>
    void navigate({
      to: "/",
      search: { ...search, ...patch, page: patch.page ?? 1 },
    });
  const query = useQuery({
    queryKey: ["nfts", search],
    queryFn: async ({ signal }) =>
      (
        await api.get<NftList>("/nfts", {
          params: search,
          signal,
        })
      ).data,
  });
  const toggle = (key: "category" | "network", value: string) => {
    const values = new Set((search[key] || "").split(",").filter(Boolean));
    if (values.has(value)) values.delete(value);
    else values.add(value);
    update({ [key]: [...values].join(",") || undefined });
  };
  const filters = (
    <div className="filters">
      <h2>Coleções</h2>
      {categories.map((c) => (
        <label className="filter-option" key={c}>
          <span>
            <input
              type="checkbox"
              checked={(search.category || "").split(",").includes(c)}
              onChange={() => toggle("category", c)}
            />
            {c}
          </span>
          <span>({query.data?.facets.category[c] ?? "—"})</span>
        </label>
      ))}
      <h2>Faixa de preço</h2>
      <label htmlFor="price-range" className="sr-only">
        Preço máximo em ETH
      </label>
      <input
        id="price-range"
        type="range"
        min="0.02"
        max="12.30"
        step="0.01"
        value={max}
        onChange={(e) => setMax(e.target.value)}
      />
      <p>Preço: 0,02 – {max} ETH</p>
      <Button size="sm" onClick={() => update({ min: "0.02", max })}>
        Aplicar
      </Button>
      <h2>Rede</h2>
      {["Ethereum", "Polygon", "Solana"].map((n) => (
        <label key={n} className="filter-option">
          <span>
            <input
              type="checkbox"
              checked={(search.network || "").split(",").includes(n)}
              onChange={() => toggle("network", n)}
            />
            {n}
          </span>
          <span>({query.data?.facets.network[n] ?? "—"})</span>
        </label>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setQ("");
          setMax("12.30");
          void navigate({ to: "/", search: {} });
        }}
      >
        Limpar filtros
      </Button>
    </div>
  );
  return (
    <>
      <form
        className="catalog-search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: q || undefined });
        }}
      >
        <div>
          <Search size={22} />
          <label htmlFor="catalog-search" className="sr-only">
            Explorar coleções
          </label>
          <input
            id="catalog-search"
            placeholder="Explorar coleções"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="sr-only">
            Buscar
          </button>
        </div>
        <Button
          size="icon"
          aria-label="Abrir filtros"
          onClick={() => setFilterOpen(true)}
        >
          <SlidersHorizontal />
        </Button>
      </form>
      <section className="hero">
        <div className="hero-copy">
          <p>Bem-vindo à Kurio</p>
          <h1>
            <span className="desktop-title">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </span>
            <span className="mobile-title">
              SEJA DONO DA
              <br />
              CULTURA DIGITAL
            </span>
          </h1>
          <p className="muted">
            <span className="desktop-description">
              Descubra NFTs selecionados de criadores emergentes e consagrados.
              Colecione arte digital rara, apoie artistas e torne uma parte do
              futuro da internet.
            </span>
            <span className="mobile-description">
              Descubra NFTs selecionados de criadores do mundo todo.
            </span>
          </p>
          <Button asChild>
            <a href="#catalogo">
              EXPLORAR <ArrowRight size={16} />
            </a>
          </Button>
        </div>
        <img
          className="hero-image"
          src="/assets/home-imgFrame136.webp"
          width="450"
          height="450"
          alt="Emerald Ape, arte digital de um macaco com óculos e jaqueta verde"
          fetchPriority="high"
        />
        <img
          className="hero-secondary"
          src="/assets/home-imgNftArtwork18.webp"
          alt=""
          width="58"
          height="58"
        />
        <div className="hero-dots" aria-hidden="true">
          ● ● ●
        </div>
      </section>
      <section className="catalog-layout" id="catalogo">
        <aside className="catalog-sidebar">
          {filters}
          <div className="featured">
            <h2>NFT EM DESTAQUE</h2>
            <p>OFERTA LIMITADA</p>
            <img
              src="/assets/home-imgNftArtwork18.webp"
              alt="Sage Nomad"
              width="310"
              height="368"
              loading="lazy"
            />
          </div>
        </aside>
        <div className="catalog-results">
          <div className="toolbar">
            <div className="tabs" aria-label="Selecionar catálogo">
              {[
                ["", "Todos os NFTs"],
                ["new", "Novos lançamentos"],
                ["trending", "Em alta"],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  aria-pressed={(search.tab || "") === tab}
                  onClick={() => update({ tab: tab || undefined })}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="sort">
              Ordenar por:{" "}
              <select
                aria-label="Ordenar NFTs"
                value={search.sort || "recent"}
                onChange={(e) => update({ sort: e.target.value })}
              >
                <option value="recent">Listados recentemente</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </label>
          </div>
          {query.isFetching && !query.isPending && (
            <p role="status" className="muted">
              Atualizando catálogo…
            </p>
          )}
          {query.isPending ? (
            <Skeleton />
          ) : query.isError ? (
            <ErrorBox error={query.error} retry={() => void query.refetch()} />
          ) : query.data.items.length ? (
            <>
              <div className="nft-grid">
                {query.data.items.map((nft, index) => (
                  <NftCard key={nft.id} nft={nft} index={index} />
                ))}
              </div>
              <nav className="pagination" aria-label="Paginação">
                {Array.from({ length: query.data.pages }, (_, i) => (
                  <Button
                    key={i}
                    variant={
                      (search.page || 1) === i + 1 ? "default" : "outline"
                    }
                    aria-current={
                      (search.page || 1) === i + 1 ? "page" : undefined
                    }
                    onClick={() => update({ page: i + 1 })}
                  >
                    {i + 1}
                  </Button>
                ))}
              </nav>
            </>
          ) : (
            <Empty>
              <h2>Nenhum NFT encontrado</h2>
              <p>Tente outra busca ou remova os filtros.</p>
              <Button
                onClick={() => {
                  setQ("");
                  void navigate({ to: "/", search: {} });
                }}
              >
                Limpar busca
              </Button>
            </Empty>
          )}
        </div>
      </section>
      <div className="promos">
        {[
          [
            "home-imgFrame136.webp",
            "Lançamentos gênesis de edição limitada",
            "Colecione edições escassas diretamente dos criadores antes da revelação pública.",
          ],
          [
            "home-imgNftArtwork05.webp",
            "Arte digital selecionada e muito mais",
            "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.",
          ],
        ].map(([img, title, text]) => (
          <article key={title}>
            <img
              src={`/assets/${img}`}
              alt=""
              width="280"
              height="250"
              loading="lazy"
            />
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
              <Button asChild size="sm">
                <a href="#catalogo">
                  Explorar <ArrowRight size={15} />
                </a>
              </Button>
            </div>
          </article>
        ))}
      </div>
      <section className="journal">
        <h2>Diário da Cunhagem</h2>
        <p className="muted">
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
        <div className="journal-grid">
          {[
            [
              "home-imgNftArtwork05.webp",
              "Como funciona a propriedade de NFTs",
            ],
            ["home-imgFrame136.webp", "10 artistas digitais para acompanhar"],
            ["home-imgNftArtwork18.webp", "Raridade, atributos e procedência"],
            ["home-imgNftArtwork09.webp", "Como proteger sua carteira"],
          ].map(([img, title]) => (
            <article key={title}>
              <img
                src={`/assets/${img}`}
                alt=""
                width="268"
                height="195"
                loading="lazy"
              />
              <div>
                <small>12 de setembro | Leitura de 6 min</small>
                <h3>{title}</h3>
                <p>Explore o universo da arte digital e conheça o mercado.</p>
                <span className="muted">Conteúdo editorial em breve</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Dialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Filtrar NFTs"
      >
        {filters}
        <Button onClick={() => setFilterOpen(false)}>Ver resultados</Button>
      </Dialog>
    </>
  );
}
export function Related() {
  const query = useQuery({
    queryKey: ["nfts", "related"],
    queryFn: async ({ signal }) =>
      (await api.get<{ items: Nft[] }>("/nfts", { signal })).data,
  });
  return (
    <section className="related">
      <h2>Mais desta coleção</h2>
      {query.isPending ? (
        <Skeleton />
      ) : (
        query.data && (
          <div className="related-grid">
            {query.data.items.slice(3, 8).map((n) => (
              <NftCard key={n.id} nft={n} />
            ))}
          </div>
        )
      )}
    </section>
  );
}
