import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MonitorPlay, Play } from "lucide-react";
import { EmptyState, SkeletonGrid } from "@/components/common/states";
import { VideoCard } from "@/components/content/VideoCard";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { FALLBACK_CATEGORIES } from "@/lib/categories";
import { formatCount, formatDuration } from "@/lib/format";
import { Link } from "react-router-dom";
import type { CategoryOut, PublicationList } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "trending", label: "Em alta" },
  { value: "recent", label: "Recentes" },
];

export default function Videocasts() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const [sort, setSort] = useState("trending");
  const [page, setPage] = useState(1);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<CategoryOut[]>("/categories"),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const videos = useQuery({
    queryKey: ["publications", "videocast", category, sort, page],
    queryFn: () =>
      apiGet<PublicationList>(
        `/publications?type=videocast&tab=${sort}&page=${page}&limit=12${category ? `&category=${encodeURIComponent(category)}` : ""}`,
      ),
    retry: false,
  });

  const names = categories.data?.map((c) => c.name) ?? FALLBACK_CATEGORIES;
  const items = videos.data?.items ?? [];
  const featured = page === 1 && !category ? items[0] : undefined;
  const grid = featured ? items.slice(1) : items;

  const setCategory = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set("category", value);
    else next.delete("category");
    setParams(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Videocasts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aulas, entrevistas e cortes produzidos por estudantes de Administração.
        </p>
      </div>

      {/* featured cinema card */}
      {featured && (
        <Link
          to={`/video/${featured.id}`}
          data-testid="videocasts-featured"
          className="group grid gap-5 overflow-hidden rounded-3xl border border-border bg-card p-4 md:grid-cols-2 md:p-5"
        >
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#263A29]">
            {featured.thumbnail_url && (
              <img src={featured.thumbnail_url} alt={featured.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
                <Play className="ml-0.5 h-6 w-6" />
              </span>
            </span>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Destaque da semana</p>
            <h2 className="font-heading text-xl font-bold leading-snug md:text-2xl">{featured.title}</h2>
            <p className="line-clamp-3 text-sm text-muted-foreground">{featured.description}</p>
            <p className="text-xs text-muted-foreground">
              {featured.author_name} · {formatCount(featured.views)} visualizações ·{" "}
              {formatDuration(featured.duration_sec)}
            </p>
          </div>
        </Link>
      )}

      {/* filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" data-testid="category-pills">
          <button
            onClick={() => setCategory("")}
            data-testid="category-pill-all"
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              !category ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
            )}
          >
            Todas
          </button>
          {names.map((name) => (
            <button
              key={name}
              onClick={() => setCategory(name)}
              data-testid={`category-pill-${name}`}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                category === name
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {SORTS.map((s) => (
            <Button
              key={s.value}
              variant={sort === s.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setSort(s.value);
                setPage(1);
              }}
              data-testid={`videocasts-sort-${s.value}`}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {videos.isLoading ? (
        <SkeletonGrid count={8} />
      ) : videos.isError ? (
        <EmptyState icon={MonitorPlay} title="Não foi possível carregar os videocasts" description="Tente novamente em instantes." />
      ) : grid.length === 0 && !featured ? (
        <EmptyState
          icon={MonitorPlay}
          title="Nenhum videocast nesta categoria"
          description="Escolha outra área ou publique o primeiro vídeo no estúdio."
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="videocasts-grid">
            {grid.map((pub) => (
              <VideoCard key={pub.id} pub={pub} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3">
            {page > 1 && (
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} data-testid="videocasts-prev">
                Anterior
              </Button>
            )}
            {videos.data?.has_more && (
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} data-testid="videocasts-next">
                Carregar mais
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
