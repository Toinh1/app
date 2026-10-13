import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones, History, Plus, Radio } from "lucide-react";
import { EmptyState, SkeletonGrid } from "@/components/common/states";
import { PodcastRow, ProgramCard } from "@/components/content/PodcastRow";
import { ProgramFormDialog } from "@/components/content/dialogs";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/session";
import { useAudioPlayer } from "@/player/AudioPlayerProvider";
import type { LibraryPayload, ProgramOut, PublicationList } from "@/lib/types";

export default function Podcasts() {
  const { data: me } = useMe();
  const player = useAudioPlayer();
  const [programOpen, setProgramOpen] = useState(false);

  const programs = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiGet<ProgramOut[]>("/programs"),
    retry: false,
  });

  const episodes = useQuery({
    queryKey: ["publications", "podcast", "trending"],
    queryFn: () => apiGet<PublicationList>("/publications?type=podcast&tab=trending&limit=24"),
    retry: false,
  });

  const library = useQuery({
    queryKey: ["library"],
    queryFn: () => apiGet<LibraryPayload>("/library"),
    enabled: !!me,
    retry: false,
  });

  const continueListening = (library.data?.history ?? [])
    .filter((h) => h.publication.media_kind === "audio" && h.position_sec > 5)
    .slice(0, 4);

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#263A29] via-[#3C5130] to-[#556B2F] p-7 text-white md:p-10">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#DCE5D0]">
          <Headphones className="h-4 w-4" /> Áudio da comunidade
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold md:text-4xl">Podcasts de Administração</h1>
        <p className="mt-3 max-w-2xl text-[#DCE5D0]">
          Ouça relatos, entrevistas e debates enquanto navega — o player continua tocando em qualquer
          página da plataforma.
        </p>
        {me && (
          <Button
            onClick={() => setProgramOpen(true)}
            data-testid="create-program-button"
            className="mt-6 gap-2 bg-[#DCE5D0] text-[#263A29] hover:bg-white"
          >
            <Plus className="h-4 w-4" /> Criar meu programa
          </Button>
        )}
      </section>

      {me && continueListening.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
            <History className="h-5 w-5 text-primary" /> Continue ouvindo
          </h2>
          <div className="grid gap-3 lg:grid-cols-2" data-testid="continue-listening">
            {continueListening.map((entry) => (
              <button
                key={entry.publication.id}
                data-testid={`continue-listening-${entry.publication.id}`}
                onClick={() => player.playPublication(entry.publication, entry.position_sec)}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all duration-200 hover:shadow-md"
              >
                <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#263A29]">
                  {entry.publication.cover_url && (
                    <img src={entry.publication.cover_url} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{entry.publication.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    Retomar em {Math.floor(entry.position_sec / 60)}:
                    {String(Math.floor(entry.position_sec % 60)).padStart(2, "0")}
                  </span>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, (entry.position_sec / Math.max(1, entry.publication.duration_sec)) * 100)}%`,
                      }}
                    />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
          <Radio className="h-5 w-5 text-primary" /> Podcasts em destaque
        </h2>
        {programs.isLoading ? (
          <SkeletonGrid count={4} />
        ) : (programs.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Radio}
            title="Nenhum programa publicado ainda"
            description="Crie o seu programa e publique o primeiro episódio pelo estúdio."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="programs-grid">
            {programs.data!.map((program) => (
              <ProgramCard
                key={program.id}
                id={program.id}
                title={program.title}
                description={program.description}
                coverUrl={program.cover_url}
                hostName={program.host_name}
                episodesCount={program.episodes_count}
                followersCount={program.followers_count}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-bold">Todos os episódios</h2>
        {episodes.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (episodes.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={Headphones} title="Nenhum episódio disponível" description="Grave o seu primeiro áudio no estúdio." />
        ) : (
          <div className="space-y-3" data-testid="episodes-list">
            {episodes.data!.items.map((pub) => (
              <PodcastRow key={pub.id} pub={pub} />
            ))}
          </div>
        )}
      </section>

      <ProgramFormDialog open={programOpen} onOpenChange={setProgramOpen} />
    </div>
  );
}
