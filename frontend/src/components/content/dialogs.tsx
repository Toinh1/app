import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { apiDelete, apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import { FALLBACK_CATEGORIES, REPORT_REASONS } from "@/lib/categories";
import { useMe } from "@/lib/session";
import type { CategoryOut, LibraryPayload, MessageOut, PlaylistOut, ProgramOut, PublicationOut } from "@/lib/types";

// Reusable category <Select> fed by /api/categories (falls back to the seeded list offline).
export function CategorySelect({
  value,
  onChange,
  testid = "category-select",
}: {
  value: string;
  onChange: (value: string) => void;
  testid?: string;
}) {
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<CategoryOut[]>("/categories"),
    staleTime: 5 * 60_000,
  });
  const names = categories.data?.map((c) => c.name) ?? FALLBACK_CATEGORIES;
  return (
    <Select value={value} onValueChange={(v: string) => onChange(v)}>
      <SelectTrigger data-testid={testid} aria-label="Categoria">
        <SelectValue placeholder="Selecione a categoria">
          {(v: string) => v || "Selecione a categoria"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {names.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Denounce any content: reason + details go to the moderation queue (/admin).
export function ReportDialog({
  open,
  onOpenChange,
  targetId,
  targetType,
  targetLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  targetType: "publication" | "comment" | "user";
  targetLabel?: string;
}) {
  const { data: me } = useMe();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const submit = useMutation({
    mutationFn: () =>
      apiPost<MessageOut>("/reports", { target_id: targetId, target_type: targetType, reason, details }),
    onSuccess: (res) => {
      toast.success(res.message);
      setDetails("");
      onOpenChange(false);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="report-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" /> Denunciar conteúdo
          </DialogTitle>
          <DialogDescription>
            {targetLabel ? `“${targetLabel}” — ` : ""}nossa equipe de moderação irá analisar sua denúncia.
          </DialogDescription>
        </DialogHeader>
        {me ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={reason} onValueChange={(v: string) => setReason(v)}>
                <SelectTrigger data-testid="report-reason-select">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-details">Detalhes (opcional)</Label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Conte o que aconteceu…"
                rows={3}
                data-testid="report-details-input"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="report-cancel-button">
                Cancelar
              </Button>
              <Button onClick={() => submit.mutate()} disabled={submit.isPending} data-testid="report-submit-button">
                {submit.isPending ? "Enviando…" : "Enviar denúncia"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Entre na sua conta para denunciar conteúdos.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <a href="/login" className={buttonVariants()} data-testid="report-login-button">
                Entrar
              </a>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Pick (or create) a playlist for a publication.
export function PlaylistPickerDialog({
  open,
  onOpenChange,
  publication,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publication: PublicationOut;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const library = useQuery({
    queryKey: ["library"],
    queryFn: () => apiGet<LibraryPayload>("/library"),
    enabled: open,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["library"] });

  const addTo = useMutation({
    mutationFn: (vars: { playlistId: string; add: boolean }) =>
      vars.add
        ? apiPost<PlaylistOut>(`/playlists/${vars.playlistId}/items`, { publication_id: publication.id })
        : apiDelete<PlaylistOut>(`/playlists/${vars.playlistId}/items/${publication.id}`),
    onSuccess: () => {
      refresh();
      toast.success("Biblioteca atualizada.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const create = useMutation({
    mutationFn: () => apiPost<PlaylistOut>("/playlists", { title, is_public: true }),
    onSuccess: (playlist) => {
      setTitle("");
      refresh();
      addTo.mutate({ playlistId: playlist.id, add: true });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const playlists = library.data?.playlists ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="playlist-picker-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-4 w-4" /> Salvar em playlist
          </DialogTitle>
          <DialogDescription>“{publication.title}”</DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {playlists.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Você ainda não tem playlists. Crie a primeira abaixo.
            </p>
          )}
          {playlists.map((pl) => {
            const has = pl.items.some((i) => i.id === publication.id);
            return (
              <button
                key={pl.id}
                data-testid={`playlist-option-${pl.id}`}
                onClick={() => addTo.mutate({ playlistId: pl.id, add: !has })}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">{pl.title}</span>
                <span className="text-xs text-muted-foreground">{has ? "Remover" : "Adicionar"}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome da nova playlist"
            data-testid="playlist-name-input"
          />
          <Button
            onClick={() => title.trim() && create.mutate()}
            disabled={!title.trim() || create.isPending}
            data-testid="playlist-create-button"
          >
            Criar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Create a new debate on the Mesa de Ideias.
export function DebateFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const create = useMutation({
    mutationFn: () =>
      apiPost<PublicationOut>("/publications", {
        type: "debate",
        title,
        description,
        category,
        media_kind: "text",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["publications"] });
      void queryClient.invalidateQueries({ queryKey: ["explore"] });
      toast.success("Debate publicado na Mesa de Ideias!");
      setTitle("");
      setDescription("");
      setCategory("");
      onOpenChange(false);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="debate-form-dialog">
        <DialogHeader>
          <DialogTitle>Criar novo debate</DialogTitle>
          <DialogDescription>
            Lance uma pergunta ou tese para a comunidade discutir na Mesa de Ideias.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debate-title">Pergunta ou tese</Label>
            <Input
              id="debate-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: A IA vai transformar a profissão de administrador?"
              data-testid="debate-title-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debate-description">Contexto</Label>
            <Textarea
              id="debate-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhe o tema, dados e caminhos para a discussão…"
              rows={4}
              data-testid="debate-description-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <CategorySelect value={category} onChange={setCategory} testid="debate-category-select" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="debate-cancel-button">
              Cancelar
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={!title.trim() || create.isPending}
              data-testid="debate-submit-button"
            >
              {create.isPending ? "Publicando…" : "Publicar debate"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Create a podcast program (show) before publishing episodes to it.
export function ProgramFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => apiPost<ProgramOut>("/programs", { title, description, cover_url: "" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Programa criado! Agora você pode publicar episódios nele.");
      setTitle("");
      setDescription("");
      onOpenChange(false);
      navigate("/podcasts");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="program-form-dialog">
        <DialogHeader>
          <DialogTitle>Criar programa de podcast</DialogTitle>
          <DialogDescription>
            Um programa reúne seus episódios em temporadas — como um show no Spotify.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program-title">Nome do programa</Label>
            <Input
              id="program-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Mesa Redonda ADM"
              data-testid="program-title-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-description">Descrição</Label>
            <Textarea
              id="program-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sobre o que é o seu programa?"
              rows={3}
              data-testid="program-description-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={!title.trim() || create.isPending}
              data-testid="program-submit-button"
            >
              {create.isPending ? "Criando…" : "Criar programa"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Follow/unfollow a creator — hides itself on your own profile.
export function FollowButton({
  userId,
  initialFollowing,
  testid = "follow-button",
  className,
}: {
  userId: string;
  initialFollowing: boolean;
  testid?: string;
  className?: string;
}) {
  const { data: me } = useMe();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  if (!me || me.id === userId) return null;

  const toggle = () => {
    setPending(true);
    const next = !following;
    setFollowing(next);
    apiPost<{ following: boolean }>(`/users/${userId}/follow`)
      .then((res) => setFollowing(res.following))
      .catch(() => setFollowing(!next))
      .finally(() => setPending(false));
  };

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      onClick={toggle}
      disabled={pending}
      data-testid={testid}
      className={className}
    >
      {following ? "Seguindo" : "Seguir"}
    </Button>
  );
}
