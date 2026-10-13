import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Flame, Inbox, Play, Sparkles, TrendingUp, UserPlus } from "lucide-react";
import { EmptyState, SkeletonGrid } from "@/components/common/states";
import { PublicationCard } from "@/components/content/PublicationCard";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet } from "@/lib/api";
import { contentPath } from "@/lib/categories";
import { formatCount, formatDuration } from "@/lib/format";
import { useMe } from "@/lib/session";
import { useAudioPlayer } from "@/player/AudioPlayerProvider";
import type { ExplorePayload, PublicationList, PublicationOut } from "@/lib/types";

const TABS = [
  { value: "foryou", label: "Para você" },
  { value: "trending", label: "Em alta" },
  { value: "recent", label: "Recentes" },
  { value: "following", label: "Seguindo" },
];

export default function Home() {
  const { data: me } = useMe();
  const [tab, setTab] = useState("foryou");
  const [page, setPage] = useState(1);
  const player = useAudioPlayer();

  const explore = useQuery({
    queryKey: ["explore"],
    queryFn: () => apiGet<ExplorePayload>("/explore"),
    retry: false,
  });

  const feed = useQuery({
    queryKey: ["publications", "feed", tab, page],
    queryFn: () => apiGet<PublicationList>(`/publications?tab=${tab}&page=${page}&limit=12`),
    retry: false,
  });

  const hero = explore.data?.featured?.[0];
  const spotlight = explore.data?.featured?.slice(1, 4) ?? [];

  return (
    <div className="space-y-10">
      {/* welcome / hero — renders unconditionally, never gated on a fetch */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative min-w-0 overflow-hidden rounded-3xl bg-[#263A29] p-6 text-white sm:p-7 lg:col-span-7 lg:p-10"
        >
          <Badge className="bg-white/15 text-[#DCE5D0] hover:bg-white/20">
            <Sparkles className="mr-1 h-3 w-3" /> Rede acadêmica de Administração
          </Badge>
          <h1 className="mt-4 font-heading text-[28px] font-bold leading-tight break-words sm:text-3xl lg:text-[42px]">
            Conhecimento que conecta.
            <br />
            <span className="text-[#A3BD82]">Ideias que transformam.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[#DCE5D0]">
            {me
              ? `Que bom te ver de novo, ${me.name.split(" ")[0]}. Veja o que a comunidade publicou enquanto você esteve fora.`
              : "Videocasts, podcasts, relatos e debates produzidos por estudantes de Administração de todo o país."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/estudio" className={buttonVariants({ className: "bg-[#DCE5D0] text-[#263A29] hover:bg-white" })} data-testid="hero-studio-link">
              Gravar no estúdio
            </Link>
            <Link
              to="/explorar"
              className={buttonVariants({ variant: "outline", className: "border-white/30 bg-transparent text-white hover:bg-white/10" })}
              data-testid="hero-explore-link"
            >
              Explorar conteúdos
            </Link>
          </div>
        </motion.div>

        <div className="min-w-0 space-y-3 lg:col-span-5">
          <p className="flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <Flame className="h-4 w-4 text-primary" /> Episódios mais populares
          </p>
          {explore.isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[76px] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : hero ? (
            <div className="space-y-3">
              <FeaturedRow pub={hero} onPlay={() => player.playPublication(hero)} highlight />
              {spotlight.map((pub) => (
                <FeaturedRow key={pub.id} pub={pub} onPlay={() => player.playPublication(pub)} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
              Os destaques aparecerão aqui assim que houver conteúdos publicados.
            </div>
          )}
        </div>
      </section>

      {/* feed */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-bold">Feed da comunidade</h2>
          <Tabs
            value={tab}
            onValueChange={(v: string) => {
              setTab(v);
              setPage(1);
            }}
          >
            <TabsList variant="line" data-testid="feed-tabs">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} data-testid={`feed-tab-${t.value}`}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map((t) => (
              <TabsContent key={t.value} value={t.value} />
            ))}
          </Tabs>
        </div>

        {feed.isLoading ? (
          <SkeletonGrid count={6} />
        ) : feed.isError ? (
          <EmptyState
            icon={Inbox}
            title="Não foi possível carregar o feed"
            description="Verifique sua conexão e tente novamente em instantes."
          />
        ) : (feed.data?.items.length ?? 0) === 0 ? (
          tab === "following" ? (
            <EmptyState
              icon={UserPlus}
              title={me ? "Você ainda não segue ninguém" : "Entre para ver quem você segue"}
              description="Siga criadores em Explorar para receber as publicações deles aqui."
              action={
                <Link to="/explorar" className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="following-empty-explore">
                  Descobrir criadores
                </Link>
              }
            />
          ) : (
            <EmptyState icon={Inbox} title="Nenhuma publicação por aqui ainda" description="Seja a primeira pessoa a publicar no estúdio." />
          )
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="feed-grid">
              {feed.data!.items.map((pub) => (
                <PublicationCard key={pub.id} pub={pub} />
              ))}
            </div>
            <div className="flex items-center justify-center gap-3">
              {page > 1 && (
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} data-testid="feed-prev-page">
                  Anterior
                </Button>
              )}
              {feed.data!.has_more && (
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} data-testid="feed-next-page">
                  Carregar mais
                </Button>
              )}
            </div>
          </>
        )}
      </section>

      {/* creators */}
      {(explore.data?.creators.length ?? 0) > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <TrendingUp className="h-5 w-5 text-primary" /> Criadores em destaque
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {explore.data!.creators.slice(0, 6).map((creator) => (
              <Link
                key={creator.id}
                to={`/perfil/${creator.id}`}
                data-testid={`home-creator-${creator.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground">
                  {creator.name.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{creator.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {creator.area || creator.institution || "Administração"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FeaturedRow({
  pub,
  onPlay,
  highlight,
}: {
  pub: PublicationOut;
  onPlay: () => void;
  highlight?: boolean;
}) {
  const isAudio = pub.media_kind === "audio" && !!pub.media_url;
  const image = pub.cover_url || pub.thumbnail_url;
  return (
    <div
      data-testid={`featured-row-${pub.id}`}
      className={`flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-all duration-200 hover:shadow-md ${
        highlight ? "ring-1 ring-primary/30" : ""
      }`}
    >
      {isAudio ? (
        <button
          onClick={onPlay}
          data-testid={`featured-play-${pub.id}`}
          aria-label={`Reproduzir ${pub.title}`}
          className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#263A29]"
        >
          {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#DCE5D0] text-[#263A29]">
            <Play className="ml-0.5 h-3.5 w-3.5" />
          </span>
        </button>
      ) : (
        <Link to={contentPath(pub)} className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted" data-testid={`featured-open-${pub.id}`}>
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#556B2F] to-[#263A29]" />
          )}
        </Link>
      )}
      <Link to={contentPath(pub)} className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{pub.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {pub.author_name} · {formatCount(pub.views)} {pub.media_kind === "audio" ? "reproduções" : "views"}
          {pub.duration_sec > 0 ? ` · ${formatDuration(pub.duration_sec)}` : ""}
        </p>
      </Link>
    </div>
  );
}
