import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Headphones, Play } from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState, PageLoader } from "@/components/common/states";
import { PodcastRow } from "@/components/content/PodcastRow";
import { Button } from "@/components/ui/button";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { useMe } from "@/lib/session";
import { useAudioPlayer } from "@/player/AudioPlayerProvider";
import type { ProgramDetail as ProgramDetailType } from "@/lib/types";

export default function PodcastDetail() {
  const { id = "" } = useParams();
  const { data: me } = useMe();
  const player = useAudioPlayer();
  const queryClient = useQueryClient();

  const program = useQuery({
    queryKey: ["program", id],
    queryFn: () => apiGet<ProgramDetailType>(`/programs/${id}`),
    enabled: !!id,
    retry: false,
  });

  const follow = useMutation({
    mutationFn: () => apiPost<{ following: boolean }>(`/programs/${id}/follow`),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["program", id] });
      toast.success(res.following ? "Você está seguindo este programa." : "Deixou de seguir o programa.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  if (program.isLoading) return <PageLoader />;
  if (program.isError || !program.data) {
    return (
      <EmptyState
        icon={Headphones}
        title="Programa não encontrado"
        description="Este programa pode ter sido removido."
        action={
          <Link to="/podcasts" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Voltar aos podcasts
          </Link>
        }
      />
    );
  }

  const p = program.data;
  const firstEpisode = p.episodes[0];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-3xl bg-gradient-to-br from-[#263A29] to-[#556B2F] p-6 text-white md:grid-cols-[220px_1fr] md:p-8">
        <div className="aspect-square overflow-hidden rounded-2xl bg-black/30 shadow-lg">
          {p.cover_url ? (
            <img src={p.cover_url} alt={p.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Headphones className="h-12 w-12 text-[#DCE5D0]" />
            </div>
          )}
        </div>
        <div className="flex flex-col justify-end gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#DCE5D0]">Programa</p>
          <h1 className="font-heading text-3xl font-bold md:text-4xl" data-testid="program-title">
            {p.title}
          </h1>
          <p className="max-w-2xl text-sm text-[#DCE5D0]">{p.description}</p>
          <div className="flex items-center gap-2 text-sm">
            <Avatar name={p.host_name} url={p.host_avatar} className="h-7 w-7 text-xs" />
            <Link to={`/perfil/${p.host_id}`} className="font-medium hover:underline" data-testid="program-host-link">
              {p.host_name}
            </Link>
            <span className="text-[#DCE5D0]">
              · {p.episodes_count} episódios · {formatCount(p.followers_count)} seguidores
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {firstEpisode && (
              <Button
                onClick={() => player.playPublication(firstEpisode)}
                data-testid="program-play-button"
                className="gap-2 bg-[#DCE5D0] text-[#263A29] hover:bg-white"
              >
                <Play className="h-4 w-4" /> Ouvir agora
              </Button>
            )}
            {me && (
              <Button
                variant="outline"
                onClick={() => follow.mutate()}
                disabled={follow.isPending}
                data-testid="program-follow-button"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                {p.is_following ? "Seguindo" : "Seguir programa"}
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-bold">Episódios</h2>
        {p.episodes.length === 0 ? (
          <EmptyState
            icon={Headphones}
            title="Nenhum episódio publicado"
            description={
              me?.id === p.host_id
                ? "Grave o primeiro episódio no estúdio e vincule a este programa."
                : "Este programa ainda não publicou episódios."
            }
          />
        ) : (
          <div className="space-y-3" data-testid="program-episodes">
            {p.episodes.map((episode) => (
              <PodcastRow key={episode.id} pub={episode} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
