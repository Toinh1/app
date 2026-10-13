import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, History, LibraryBig, ListMusic, Plus, ThumbsUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageLoader } from "@/components/common/states";
import { PublicationCard } from "@/components/content/PublicationCard";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiDelete, apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import { contentPath } from "@/lib/categories";
import { formatDuration, timeAgo } from "@/lib/format";
import { useAudioPlayer } from "@/player/AudioPlayerProvider";
import type { LibraryPayload, PlaylistOut } from "@/lib/types";

export default function Library() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const initialTab = tabParam === "favoritos" ? "saved" : (tabParam ?? "saved");
  const [tab, setTab] = useState(initialTab);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<PlaylistOut | null>(null);
  const queryClient = useQueryClient();
  const player = useAudioPlayer();

  const library = useQuery({
    queryKey: ["library"],
    queryFn: () => apiGet<LibraryPayload>("/library"),
    retry: false,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["library"] });

  const createPlaylist = useMutation({
    mutationFn: () => apiPost<PlaylistOut>("/playlists", { title: newTitle, is_public: true }),
    onSuccess: () => {
      setNewTitle("");
      setCreateOpen(false);
      refresh();
      toast.success("Playlist criada.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deletePlaylist = useMutation({
    mutationFn: (id: string) => apiDelete(`/playlists/${id}`),
    onSuccess: () => {
      setConfirmDelete(null);
      refresh();
      toast.success("Playlist removida.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const removeItem = useMutation({
    mutationFn: (vars: { playlistId: string; pubId: string }) =>
      apiDelete(`/playlists/${vars.playlistId}/items/${vars.pubId}`),
    onSuccess: () => {
      refresh();
      toast.success("Item removido da playlist.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  if (library.isLoading) return <PageLoader />;

  const data = library.data;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold">
            <LibraryBig className="h-6 w-6 text-primary" /> Minha biblioteca
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Favoritos, curtidas, playlists e histórico de reprodução em um só lugar.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="library-create-playlist" className="gap-2">
          <Plus className="h-4 w-4" /> Nova playlist
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v: string) => {
          setTab(v);
          const next = new URLSearchParams(params);
          next.set("tab", v);
          setParams(next, { replace: true });
        }}
      >
        <TabsList variant="line" data-testid="library-tabs">
          <TabsTrigger value="saved" data-testid="library-tab-saved">
            <Bookmark className="mr-1.5 h-4 w-4" /> Favoritos
          </TabsTrigger>
          <TabsTrigger value="liked" data-testid="library-tab-liked">
            <ThumbsUp className="mr-1.5 h-4 w-4" /> Curtidos
          </TabsTrigger>
          <TabsTrigger value="playlists" data-testid="library-tab-playlists">
            <ListMusic className="mr-1.5 h-4 w-4" /> Playlists
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="library-tab-history">
            <History className="mr-1.5 h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="pt-6">
          {(data?.saved.length ?? 0) === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="Nenhum favorito ainda"
              description="Toque no ícone de marcador em qualquer conteúdo para salvá-lo aqui."
              action={
                <Link to="/explorar" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Explorar conteúdos
                </Link>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="library-saved-grid">
              {data!.saved.map((pub) => (
                <PublicationCard key={pub.id} pub={pub} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="liked" className="pt-6">
          {(data?.liked.length ?? 0) === 0 ? (
            <EmptyState icon={ThumbsUp} title="Você ainda não curtiu nada" description="As curtidas aparecem aqui." />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="library-liked-grid">
              {data!.liked.map((pub) => (
                <PublicationCard key={pub.id} pub={pub} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="playlists" className="pt-6">
          {(data?.playlists.length ?? 0) === 0 ? (
            <EmptyState
              icon={ListMusic}
              title="Nenhuma playlist criada"
              description="Organize episódios e vídeos em coleções próprias."
              action={
                <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                  Criar playlist
                </Button>
              }
            />
          ) : (
            <div className="space-y-5" data-testid="library-playlists">
              {data!.playlists.map((playlist) => (
                <div key={playlist.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-heading text-base font-bold">{playlist.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {playlist.items.length} {playlist.items.length === 1 ? "item" : "itens"} ·{" "}
                        {playlist.is_public ? "Pública" : "Privada"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setConfirmDelete(playlist)}
                      aria-label={`Excluir playlist ${playlist.title}`}
                      data-testid={`playlist-delete-${playlist.id}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {playlist.items.length > 0 && (
                    <ul className="mt-3 space-y-2 border-t border-border pt-3">
                      {playlist.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-3">
                          {item.media_kind === "audio" && item.media_url ? (
                            <Button
                              variant="outline"
                              size="icon-xs"
                              onClick={() => player.playPublication(item)}
                              aria-label={`Reproduzir ${item.title}`}
                              data-testid={`playlist-play-${item.id}`}
                            >
                              ▶
                            </Button>
                          ) : (
                            <span className="w-6" />
                          )}
                          <Link to={contentPath(item)} className="min-w-0 flex-1 truncate text-sm hover:underline">
                            {item.title}
                          </Link>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {item.duration_sec > 0 ? formatDuration(item.duration_sec) : ""}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeItem.mutate({ playlistId: playlist.id, pubId: item.id })}
                            aria-label="Remover da playlist"
                            data-testid={`playlist-remove-item-${item.id}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="pt-6">
          {(data?.history.length ?? 0) === 0 ? (
            <EmptyState icon={History} title="Histórico vazio" description="Os conteúdos que você reproduzir aparecem aqui." />
          ) : (
            <ul className="space-y-3" data-testid="library-history">
              {data!.history.map((entry) => (
                <li
                  key={entry.publication.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  {entry.publication.media_kind === "audio" && entry.publication.media_url ? (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => player.playPublication(entry.publication, entry.position_sec)}
                      aria-label={`Retomar ${entry.publication.title}`}
                      data-testid={`history-resume-${entry.publication.id}`}
                    >
                      ▶
                    </Button>
                  ) : (
                    <span className="w-9" />
                  )}
                  <Link to={contentPath(entry.publication)} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.publication.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.publication.author_name} · parou em {formatDuration(entry.position_sec)} ·{" "}
                      {timeAgo(entry.updated_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="create-playlist-dialog">
          <DialogHeader>
            <DialogTitle>Nova playlist</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ex.: Estudar para a prova de Finanças"
            data-testid="new-playlist-input"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createPlaylist.mutate()}
              disabled={!newTitle.trim() || createPlaylist.isPending}
              data-testid="new-playlist-submit"
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent data-testid="confirm-delete-playlist-dialog">
          <DialogHeader>
            <DialogTitle>Excluir playlist?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            “{confirmDelete?.title}” será removida permanentemente. Os conteúdos continuam disponíveis
            na plataforma.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && deletePlaylist.mutate(confirmDelete.id)}
              disabled={deletePlaylist.isPending}
              data-testid="confirm-delete-playlist-button"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
