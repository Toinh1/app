import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { HeartHandshake, MessageSquareHeart, Mic, Search } from "lucide-react";
import { EmptyState, SkeletonGrid } from "@/components/common/states";
import { PublicationCard } from "@/components/content/PublicationCard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api";
import { FALLBACK_CATEGORIES } from "@/lib/categories";
import { useMe } from "@/lib/session";
import type { CategoryOut, PublicationList } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "recent", label: "Recentes" },
  { value: "trending", label: "Mais engajados" },
];

// "Vozes da Administração" — community experiences in text, audio or video.
export default function Relatos() {
  const { data: me } = useMe();
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<CategoryOut[]>("/categories"),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const relatos = useQuery({
    queryKey: ["publications", "relato", category, sort, search, page],
    queryFn: () =>
      apiGet<PublicationList>(
        `/publications?type=relato&tab=${sort}&page=${page}&limit=9${
          category ? `&category=${encodeURIComponent(category)}` : ""
        }${search.trim() ? `&q=${encodeURIComponent(search.trim())}` : ""}`,
      ),
    retry: false,
  });

  const names = categories.data?.map((c) => c.name) ?? FALLBACK_CATEGORIES;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-[#DCE5D0] bg-[#EDF2E8] p-7 dark:border-[#28392A] dark:bg-[#1B261D] md:p-10">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <HeartHandshake className="h-4 w-4" /> Vozes da Administração
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold md:text-4xl">Relatos da comunidade</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Um espaço acolhedor para compartilhar estágios, entrevistas, dificuldades da graduação,
          histórias de superação e conselhos para quem está começando. Aqui o respeito vem primeiro.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/estudio" className={buttonVariants()} data-testid="relatos-create-link">
            {me ? "Compartilhar meu relato" : "Entrar para compartilhar"}
          </Link>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mic className="h-3.5 w-3.5" /> Em texto, áudio ou vídeo
          </span>
        </div>
      </section>

      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar relatos por assunto…"
            aria-label="Buscar relatos"
            data-testid="relatos-search-input"
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2" data-testid="relatos-category-pills">
          <button
            onClick={() => {
              setCategory("");
              setPage(1);
            }}
            data-testid="relatos-category-all"
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
              onClick={() => {
                setCategory(name);
                setPage(1);
              }}
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
              data-testid={`relatos-sort-${s.value}`}
            >
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {relatos.isLoading ? (
        <SkeletonGrid count={6} />
      ) : relatos.isError ? (
        <EmptyState icon={MessageSquareHeart} title="Não foi possível carregar os relatos" description="Tente novamente em instantes." />
      ) : (relatos.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          icon={MessageSquareHeart}
          title="Nenhum relato encontrado"
          description="Ajuste os filtros ou seja a primeira pessoa a compartilhar uma experiência."
        />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="relatos-grid">
            {relatos.data!.items.map((pub) => (
              <PublicationCard key={pub.id} pub={pub} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3">
            {page > 1 && (
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} data-testid="relatos-prev">
                Anterior
              </Button>
            )}
            {relatos.data?.has_more && (
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} data-testid="relatos-next">
                Carregar mais
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
