import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Flag, ListPlus, MonitorPlay, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState, PageLoader } from "@/components/common/states";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { CommentThread } from "@/components/content/CommentThread";
import { VideoCard } from "@/components/content/VideoCard";
import { FollowButton, PlaylistPickerDialog, ReportDialog } from "@/components/content/dialogs";
import { useLikeSave } from "@/components/content/useLikeSave";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { formatCount, formatDate } from "@/lib/format";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { ProfileOut, PublicationList, PublicationOut } from "@/lib/types";

export default function VideoDetail() {
  const { id = "" } = useParams();
  const { data: me } = useMe();
  const viewedRef = useRef<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);

  const publication = useQuery({
    queryKey: ["publication", id],
    queryFn: () => apiGet<PublicationOut>(`/publications/${id}`),
    enabled: !!id,
    retry: false,
  });

  const related = useQuery({
    queryKey: ["publication", id, "related"],
    queryFn: () => apiGet<PublicationList>(`/publications/${id}/related`),
    enabled: !!id,
    retry: false,
  });

  const author = useQuery({
    queryKey: ["profile", publication.data?.author_id],
    queryFn: () => apiGet<ProfileOut>(`/users/${publication.data!.author_id}`),
    enabled: !!publication.data?.author_id,
    retry: false,
  });

  // one view per mount, per publication
  useEffect(() => {
    if (!id || viewedRef.current === id) return;
    viewedRef.current = id;
    void apiPost(`/publications/${id}/view`).catch(() => undefined);
  }, [id]);

  if (publication.isLoading) return <PageLoader />;
  if (publication.isError || !publication.data) {
    return (
      <EmptyState
        icon={MonitorPlay}
        title="Conteúdo não encontrado"
        description="Este videocast pode ter sido removido ou o link está incorreto."
        action={
          <Link to="/videocasts" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Voltar ao catálogo
          </Link>
        }
      />
    );
  }

  const pub = publication.data;
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-8">
        {pub.media_url ? (
          <VideoPlayer
            src={pub.media_url}
            poster={pub.thumbnail_url}
            onProgress={(seconds) => {
              if (!me) return;
              void apiPost(`/history?publication_id=${pub.id}&position_sec=${Math.floor(seconds)}`).catch(() => undefined);
            }}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-card">
            <p className="text-sm text-muted-foreground">Este conteúdo não possui arquivo de vídeo.</p>
          </div>
        )}

        <div className="space-y-4">
          <h1 className="font-heading text-xl font-bold leading-snug md:text-2xl" data-testid="video-title">
            {pub.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            {pub.category && <Badge variant="secondary">{pub.category}</Badge>}
            {pub.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-muted-foreground">
                #{tag}
              </Badge>
            ))}
            {pub.is_demo && (
              <Badge variant="outline" className="border-dashed text-muted-foreground">
                Conteúdo demonstrativo
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
            <div className="flex items-center gap-3">
              <Link to={`/perfil/${pub.author_id}`} className="flex items-center gap-3" data-testid="video-author-link">
                <Avatar name={pub.author_name} url={pub.author_avatar} className="h-10 w-10 text-sm" />
                <span>
                  <span className="block text-sm font-semibold">{pub.author_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {author.data ? `${formatCount(author.data.followers_count)} seguidores` : "Criador"}
                  </span>
                </span>
              </Link>
              <FollowButton userId={pub.author_id} initialFollowing={author.data?.is_following ?? false} testid="video-follow-button" />
            </div>
            <VideoActions pub={pub} onReport={() => setReportOpen(true)} onPlaylist={() => setPlaylistOpen(true)} />
          </div>

          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {formatCount(pub.views)} visualizações · {formatDate(pub.created_at)}
            </p>
            {pub.description && (
              <>
                <p className={cn("mt-2 whitespace-pre-line text-sm leading-relaxed", !descOpen && "line-clamp-3")}>
                  {pub.description}
                </p>
                <button
                  onClick={() => setDescOpen(!descOpen)}
                  data-testid="video-description-toggle"
                  className="mt-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  {descOpen ? "Mostrar menos" : "Mostrar mais"}
                </button>
              </>
            )}
          </div>

          <CommentThread publicationId={pub.id} />
        </div>
      </div>

      <aside className="space-y-4 lg:col-span-4">
        <h2 className="font-heading text-base font-bold">Conteúdos relacionados</h2>
        {related.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (related.data?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma recomendação disponível agora.</p>
        ) : (
          <div className="space-y-3" data-testid="related-list">
            {related.data!.items
              .filter((r) => r.type === "videocast")
              .slice(0, 6)
              .map((r) => (
                <VideoCard key={r.id} pub={r} />
              ))}
            {related.data!.items.filter((r) => r.type === "videocast").length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ainda não há outros videocasts nesta categoria.
              </p>
            )}
          </div>
        )}
      </aside>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetId={pub.id} targetType="publication" targetLabel={pub.title} />
      <PlaylistPickerDialog open={playlistOpen} onOpenChange={setPlaylistOpen} publication={pub} />
    </div>
  );
}

function VideoActions({
  pub,
  onReport,
  onPlaylist,
}: {
  pub: PublicationOut;
  onReport: () => void;
  onPlaylist: () => void;
}) {
  const { liked, likesCount, saved, toggleLike, toggleSave, share, me } = useLikeSave(pub);
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleLike}
        aria-pressed={liked}
        data-testid="video-like-button"
        className={cn("gap-1.5 rounded-full", liked && "border-primary text-primary")}
      >
        <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
        {formatCount(likesCount)}
      </Button>
      <Button variant="outline" size="sm" onClick={share} data-testid="video-share-button" className="rounded-full">
        Compartilhar
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={toggleSave}
        aria-label={saved ? "Remover dos favoritos" : "Salvar na biblioteca"}
        data-testid="video-save-button"
        className={cn("rounded-full", saved && "border-primary text-primary")}
      >
        <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Adicionar à playlist"
        data-testid="video-playlist-button"
        onClick={() => {
          if (!me) {
            toast("Entre para organizar playlists.");
            return;
          }
          onPlaylist();
        }}
        className="rounded-full"
      >
        <ListPlus className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="Denunciar conteúdo"
        data-testid="video-report-button"
        onClick={onReport}
        className="rounded-full"
      >
        <Flag className="h-4 w-4" />
      </Button>
    </div>
  );
}
