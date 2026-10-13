import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Bookmark,
  Eye,
  Flag,
  ListPlus,
  MessageCircle,
  Mic,
  MessagesSquare,
  Play,
  ThumbsUp,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLikeSave } from "./useLikeSave";
import { CommentThread } from "./CommentThread";
import { PlaylistPickerDialog, ReportDialog } from "./dialogs";
import { CONTENT_TYPE_LABEL, contentPath } from "@/lib/categories";
import { formatCount, formatDuration, timeAgo } from "@/lib/format";
import { useAudioPlayer } from "@/player/AudioPlayerProvider";
import { cn } from "@/lib/utils";
import type { PublicationOut } from "@/lib/types";

// The adaptive feed card: renders itself differently for videocasts, podcast
// episodes, relatos (text/audio/video) and debates — with working like, comment,
// share, save and report actions.
export function PublicationCard({ pub }: { pub: PublicationOut }) {
  const navigate = useNavigate();
  const player = useAudioPlayer();
  const { liked, likesCount, saved, toggleLike, toggleSave, share, me } = useLikeSave(pub);
  const [expanded, setExpanded] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const isThread = pub.type === "relato" || pub.type === "debate";
  const showComments = expanded && isThread;

  const openContent = () => {
    if (pub.type === "relato" || pub.type === "debate") {
      setExpanded(true);
      return;
    }
    navigate(contentPath(pub));
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      data-testid={`publication-card-${pub.id}`}
      data-publication-type={pub.type}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md"
    >
      {/* media / header per type */}
      {pub.type === "videocast" && (
        <Link to={`/video/${pub.id}`} data-testid={`card-open-${pub.id}`} className="group relative block aspect-video overflow-hidden bg-[#263A29]">
          {pub.thumbnail_url ? (
            <img src={pub.thumbnail_url} alt={pub.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#556B2F] to-[#263A29]">
              <Video className="h-10 w-10 text-[#DCE5D0]" />
            </div>
          )}
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
              <Play className="ml-0.5 h-6 w-6" />
            </span>
          </span>
          {pub.duration_sec > 0 && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
              {formatDuration(pub.duration_sec)}
            </span>
          )}
        </Link>
      )}

      {pub.type === "podcast" && (
        <div className="flex items-center gap-4 bg-gradient-to-r from-[#263A29] to-[#556B2F] p-4">
          <button
            data-testid={`card-play-audio-${pub.id}`}
            aria-label={`Reproduzir ${pub.title}`}
            onClick={() => player.playPublication(pub)}
            className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/30 text-white transition-transform duration-200 hover:scale-105"
          >
            {pub.cover_url ? <img src={pub.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#DCE5D0] text-[#263A29] shadow">
              <Play className="ml-0.5 h-4 w-4" />
            </span>
          </button>
          <div className="min-w-0 flex-1 text-white">
            <p className="text-xs font-medium uppercase tracking-wider text-[#DCE5D0]">
              {pub.program_title || "Podcast"}
              {pub.episode_number ? ` · Ep. ${pub.episode_number}` : ""}
            </p>
            <p className="truncate font-heading text-sm font-bold">{pub.title}</p>
            <p className="text-xs text-[#DCE5D0]/80">
              {formatDuration(pub.duration_sec)} · {formatCount(pub.views)} reproduções
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 p-4">
        {/* badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-[#EDF2E8] text-[#263A29] dark:bg-[#263A29] dark:text-[#DCE5D0]">
            {CONTENT_TYPE_LABEL[pub.type]}
          </Badge>
          {pub.category && (
            <Badge variant="outline" className="border-[#DCE5D0] text-[#556B2F] dark:border-[#28392A] dark:text-[#8FA86E]">
              {pub.category}
            </Badge>
          )}
          {pub.is_demo && (
            <Badge variant="outline" className="border-dashed text-muted-foreground">
              Demo
            </Badge>
          )}
          {pub.type === "debate" && pub.resolved && (
            <Badge className="bg-[#2D6A4F] text-white">Resolvido</Badge>
          )}
          {pub.status === "draft" && (
            <Badge variant="outline" className="text-muted-foreground">
              Rascunho
            </Badge>
          )}
        </div>

        <button onClick={openContent} data-testid={`card-title-${pub.id}`} className="block w-full text-left">
          <h3 className="font-heading text-base font-bold leading-snug hover:underline">{pub.title}</h3>
        </button>

        {/* relato text body */}
        {pub.type === "relato" && pub.media_kind === "text" && (
          <p className={cn("text-sm leading-relaxed text-muted-foreground", !expanded && "line-clamp-3")}>
            {pub.description}
          </p>
        )}
        {pub.type === "debate" && (
          <p className={cn("text-sm leading-relaxed text-muted-foreground", !expanded && "line-clamp-3")}>
            {pub.description}
          </p>
        )}

        {/* relato media */}
        {pub.type === "relato" && pub.media_kind === "audio" && pub.media_url && (
          <button
            data-testid={`card-play-audio-${pub.id}`}
            onClick={() => player.playPublication(pub)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Play className="ml-0.5 h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Ouvir relato em áudio</span>
              <span className="block text-xs text-muted-foreground">{formatDuration(pub.duration_sec)}</span>
            </span>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        {pub.type === "relato" && pub.media_kind === "video" && pub.media_url && (
          <video src={pub.media_url} controls preload="metadata" className="w-full rounded-xl bg-black" data-testid={`card-video-${pub.id}`} />
        )}

        {/* debate meta */}
        {pub.type === "debate" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessagesSquare className="h-4 w-4" />
            {pub.comments_count} contribuições · {formatCount(pub.views)} visualizações
          </p>
        )}

        {/* author row */}
        <div className="flex items-center justify-between gap-2">
          <Link to={`/perfil/${pub.author_id}`} data-testid={`card-author-${pub.id}`} className="flex min-w-0 items-center gap-2">
            <Avatar name={pub.author_name} url={pub.author_avatar} className="h-8 w-8 text-xs" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{pub.author_name}</span>
              <span className="block text-xs text-muted-foreground">{timeAgo(pub.created_at)}</span>
            </span>
          </Link>
          {pub.type !== "debate" && (
            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(pub.views)}
            </span>
          )}
        </div>

        {/* actions */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              data-testid={`like-button-${pub.id}`}
              aria-pressed={liked}
              aria-label={liked ? "Remover curtida" : "Curtir"}
              onClick={toggleLike}
              className={cn("gap-1.5 text-muted-foreground", liked && "text-primary")}
            >
              <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
              {likesCount > 0 ? formatCount(likesCount) : ""}
            </Button>
            {isThread ? (
              <Button
                variant="ghost"
                size="xs"
                data-testid={`comments-toggle-${pub.id}`}
                onClick={() => setExpanded(!expanded)}
                className="gap-1.5 text-muted-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                {pub.comments_count > 0 ? formatCount(pub.comments_count) : "Comentar"}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                data-testid={`open-content-${pub.id}`}
                onClick={openContent}
                className="gap-1.5 text-muted-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                {pub.comments_count > 0 ? formatCount(pub.comments_count) : "Comentar"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="xs"
              data-testid={`share-button-${pub.id}`}
              aria-label="Copiar link"
              onClick={share}
              className="gap-1.5 text-muted-foreground"
            >
              Compartilhar
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              data-testid={`save-button-${pub.id}`}
              aria-label={saved ? "Remover dos favoritos" : "Salvar na biblioteca"}
              onClick={toggleSave}
              className={cn("text-muted-foreground", saved && "text-primary")}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              data-testid={`playlist-button-${pub.id}`}
              aria-label="Adicionar à playlist"
              onClick={() => {
                if (!me) {
                  toast("Entre para organizar playlists.", { action: { label: "Entrar", onClick: () => navigate("/login") } });
                  return;
                }
                setPlaylistOpen(true);
              }}
              className="text-muted-foreground"
            >
              <ListPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              data-testid={`report-button-${pub.id}`}
              aria-label="Denunciar conteúdo"
              onClick={() => setReportOpen(true)}
              className="text-muted-foreground"
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showComments && <CommentThread publicationId={pub.id} />}
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetId={pub.id} targetType="publication" targetLabel={pub.title} />
      <PlaylistPickerDialog open={playlistOpen} onOpenChange={setPlaylistOpen} publication={pub} />
    </motion.article>
  );
}
