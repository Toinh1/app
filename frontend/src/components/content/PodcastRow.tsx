import { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, ListPlus, MessageCircle, Pause, Play, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useLikeSave } from "./useLikeSave";
import { CommentThread } from "./CommentThread";
import { PlaylistPickerDialog } from "./dialogs";
import { formatCount, formatDuration, timeAgo } from "@/lib/format";
import { useAudioPlayer } from "@/player/AudioPlayerProvider";
import type { PublicationOut } from "@/lib/types";

// Spotify-style episode row: play feeds the persistent player; like/save/share work inline.
export function PodcastRow({ pub }: { pub: PublicationOut }) {
  const player = useAudioPlayer();
  const { liked, likesCount, saved, toggleLike, toggleSave, share, me } = useLikeSave(pub);
  const [showComments, setShowComments] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const isCurrent = player.current?.id === pub.id;
  const isPlaying = isCurrent && player.playing;

  return (
    <div
      data-testid={`podcast-row-${pub.id}`}
      className="rounded-2xl border border-border bg-card p-3 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <button
          data-testid={`podcast-row-play-${pub.id}`}
          aria-label={isPlaying ? `Pausar ${pub.title}` : `Reproduzir ${pub.title}`}
          onClick={() => player.playPublication(pub)}
          className="group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#263A29]"
        >
          {pub.cover_url ? (
            <img src={pub.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#DCE5D0] text-[#263A29] shadow transition-transform duration-200 group-hover:scale-105">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          {pub.program_title && (
            <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {pub.program_title}
              {pub.episode_number ? ` · Ep. ${pub.episode_number}` : ""}
            </p>
          )}
          <p className="truncate text-sm font-semibold">{pub.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {pub.author_name} · {formatDuration(pub.duration_sec)} · {timeAgo(pub.created_at)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            data-testid={`podcast-row-like-${pub.id}`}
            aria-label={liked ? "Remover curtida" : "Curtir episódio"}
            onClick={toggleLike}
            className={liked ? "text-primary" : "text-muted-foreground"}
          >
            <ThumbsUp className={liked ? "h-4 w-4 fill-current" : "h-4 w-4"} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            data-testid={`podcast-row-save-${pub.id}`}
            aria-label={saved ? "Remover dos favoritos" : "Salvar na biblioteca"}
            onClick={toggleSave}
            className={saved ? "text-primary" : "text-muted-foreground"}
          >
            <Bookmark className={saved ? "h-4 w-4 fill-current" : "h-4 w-4"} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            data-testid={`podcast-row-comments-${pub.id}`}
            aria-label="Ver comentários"
            onClick={() => setShowComments(!showComments)}
            className="text-muted-foreground"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            data-testid={`podcast-row-share-${pub.id}`}
            aria-label="Copiar link"
            onClick={share}
            className="text-muted-foreground"
          >
            <span className="text-xs font-medium">🔗</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            data-testid={`podcast-row-playlist-${pub.id}`}
            aria-label="Adicionar à playlist"
            onClick={() => {
              if (!me) {
                toast("Entre para organizar playlists.", { action: { label: "Entrar", onClick: () => window.location.assign("/login") } });
                return;
              }
              setPlaylistOpen(true);
            }}
            className="text-muted-foreground"
          >
            <ListPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showComments && (
        <div className="mt-3 border-t border-border pt-3">
          <CommentThread publicationId={pub.id} />
        </div>
      )}

      <PlaylistPickerDialog open={playlistOpen} onOpenChange={setPlaylistOpen} publication={pub} />
    </div>
  );
}

// Compact horizontal cover used in program grids.
export function ProgramCard({
  id,
  title,
  description,
  coverUrl,
  hostName,
  episodesCount,
  followersCount,
  testid,
}: {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  hostName?: string;
  episodesCount?: number;
  followersCount?: number;
  testid?: string;
}) {
  return (
    <Link
      to={`/podcast/${id}`}
      data-testid={testid ?? `program-card-${id}`}
      className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-[#263A29]">
        {coverUrl ? (
          <img src={coverUrl} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#556B2F] to-[#263A29] text-[#DCE5D0]" />
        )}
      </div>
      <p className="mt-3 truncate font-heading text-sm font-bold">{title}</p>
      {description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>}
      {hostName && (
        <div className="mt-2 flex items-center gap-2">
          <Avatar name={hostName} className="h-5 w-5 text-[10px]" />
          <span className="truncate text-xs text-muted-foreground">{hostName}</span>
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {episodesCount ?? 0} episódios{followersCount ? ` · ${formatCount(followersCount)} seguidores` : ""}
      </p>
    </Link>
  );
}
