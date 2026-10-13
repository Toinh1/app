import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Compass, LayoutGrid, Search, SearchX, TrendingUp, Users } from "lucide-react";
import { Avatar, EmptyState, SkeletonGrid } from "@/components/common/states";
import { PublicationCard } from "@/components/content/PublicationCard";
import { VideoCard } from "@/components/content/VideoCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiGet } from "@/lib/api";
import { CONTENT_TYPE_LABEL } from "@/lib/categories";
import { formatCount } from "@/lib/format";
import type { ContentType, ExplorePayload, SearchResults } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Todos os tipos" },
  { value: "videocast", label: "Videocasts" },
  { value: "podcast", label: "Podcasts" },
  { value: "relato", label: "Relatos" },
  { value: "debate", label: "Debates" },
];

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const section = params.get("secao") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [debounced, setDebounced] = useState(urlQuery);
  const [type, setType] = useState("");

  useEffect(() => {
    setQuery(urlQuery);
    setDebounced(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const explore = useQuery({
    queryKey: ["explore"],
    queryFn: () => apiGet<ExplorePayload>("/explore"),
    retry: false,
  });

  const search = useQuery({
    queryKey: ["search", debounced, type],
    queryFn: () =>
      apiGet<SearchResults>(`/search?q=${encodeURIComponent(debounced)}${type ? `&type=${type}` : ""}`),
    enabled: debounced.length >= 2,
    retry: false,
  });

  const searching = debounced.length >= 2;

  return (
    <div className="space-y-9">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold">
          <Compass className="h-6 w-6 text-primary" /> Explorar conteúdos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque por assunto, criador ou categoria e descubra o que a comunidade está produzindo.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              const next = new URLSearchParams(params);
              if (e.target.value) next.set("q", e.target.value);
              else next.delete("q");
              setParams(next, { replace: true });
            }}
            placeholder="Buscar vídeos, podcasts, relatos, debates, criadores…"
            aria-label="Buscar conteúdos"
            data-testid="explore-search-input"
            className="pl-10"
          />
        </div>
        <Select value={type} onValueChange={(v: string) => setType(v === "all" ? "" : v)}>
          <SelectTrigger className="sm:w-52" data-testid="explore-type-filter" aria-label="Filtrar por tipo">
            <SelectValue>
              {(v: string) => TYPE_FILTERS.find((f) => f.value === (v === "all" ? "" : v))?.label ?? "Todos os tipos"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TYPE_FILTERS.filter((f) => f.value).map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {searching ? (
        <section className="space-y-6" data-testid="search-results">
          <h2 className="font-heading text-lg font-bold">Resultados para “{debounced}”</h2>
          {search.isLoading ? (
            <SkeletonGrid count={4} />
          ) : (search.data?.publications.length ?? 0) === 0 &&
            (search.data?.creators.length ?? 0) === 0 &&
            (search.data?.categories.length ?? 0) === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Nenhum resultado encontrado"
              description="Tente outras palavras-chave ou remova os filtros aplicados."
            />
          ) : (
            <div className="space-y-8">
              {(search.data?.creators.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Users className="h-4 w-4" /> Criadores
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {search.data!.creators.map((c) => (
                      <Link
                        key={c.id}
                        to={`/perfil/${c.id}`}
                        data-testid={`search-creator-${c.id}`}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:shadow-md"
                      >
                        <Avatar name={c.name} url={c.avatar_url} className="h-10 w-10 text-sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{c.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.area || c.institution}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {(search.data?.publications.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Conteúdos
                  </h3>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {search.data!.publications.map((pub) => (
                      <PublicationCard key={pub.id} pub={pub} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="space-y-4" id="categorias">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
              <LayoutGrid className="h-5 w-5 text-primary" /> Categorias
            </h2>
            {explore.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="explore-categories">
                {(explore.data?.categories ?? []).map((category) => (
                  <Link
                    key={category.id}
                    to={`/videocasts?category=${encodeURIComponent(category.name)}`}
                    data-testid={`explore-category-${category.id}`}
                    className={cn(
                      "rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
                      section === "categorias" && "ring-1 ring-primary/20",
                    )}
                  >
                    <p className="font-heading text-sm font-bold">{category.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {category.publications_count} {category.publications_count === 1 ? "conteúdo" : "conteúdos"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
              <TrendingUp className="h-5 w-5 text-primary" /> Em alta na comunidade
            </h2>
            {explore.isLoading ? (
              <SkeletonGrid count={4} />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="explore-trending">
                {(explore.data?.trending ?? []).slice(0, 6).map((pub) => (
                  <PublicationCard key={pub.id} pub={pub} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-heading text-xl font-bold">Publicados recentemente</h2>
            {explore.isLoading ? (
              <SkeletonGrid count={4} />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="explore-recent">
                {(explore.data?.recent ?? []).map((pub) =>
                  pub.type === "videocast" ? (
                    <VideoCard key={pub.id} pub={pub} />
                  ) : (
                    <Link
                      key={pub.id}
                      to={
                        pub.type === "podcast"
                          ? pub.program_id
                            ? `/podcast/${pub.program_id}`
                            : "/podcasts"
                          : pub.type === "relato"
                            ? "/relatos"
                            : "/debates"
                      }
                      data-testid={`explore-recent-${pub.id}`}
                      className="rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                    >
                      <Badge variant="secondary" className="mb-2">
                        {CONTENT_TYPE_LABEL[pub.type as ContentType]}
                      </Badge>
                      <p className="line-clamp-2 font-heading text-sm font-bold">{pub.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{pub.description}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {pub.author_name} · {formatCount(pub.views)} visualizações
                      </p>
                    </Link>
                  ),
                )}
              </div>
            )}
          </section>

          {(explore.data?.creators.length ?? 0) > 0 && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
                <Users className="h-5 w-5 text-primary" /> Criadores para seguir
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {explore.data!.creators.map((c) => (
                  <Link
                    key={c.id}
                    to={`/perfil/${c.id}`}
                    data-testid={`explore-creator-${c.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Avatar name={c.name} url={c.avatar_url} className="h-11 w-11 text-sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{c.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.area || c.institution || "Administração"}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
