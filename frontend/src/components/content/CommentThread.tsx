import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CornerDownRight, ThumbsUp, Trash2 } from "lucide-react";
import { Avatar } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiDelete, apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { CommentOut, UserOut } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortMode = "relevant" | "recent";

// Comment tree for any publication (videos, podcast episodes, relatos, debates).
export function CommentThread({ publicationId }: { publicationId: string }) {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<SortMode>("relevant");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentOut | null>(null);

  const comments = useQuery({
    queryKey: ["comments", publicationId, sort],
    queryFn: () => apiGet<CommentOut[]>(`/publications/${publicationId}/comments?sort=${sort}`),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["comments", publicationId] });
    void queryClient.invalidateQueries({ queryKey: ["publication", publicationId] });
  };

  const submit = (value: string, parentId?: string) => {
    if (!me) {
      toast("Entre para participar das discussões.", {
        action: { label: "Entrar", onClick: () => window.location.assign("/login") },
      });
      return;
    }
    apiPost<CommentOut>(`/publications/${publicationId}/comments`, {
      text: value,
      parent_id: parentId ?? null,
    })
      .then(() => {
        setText("");
        setReplyTo(null);
        invalidate();
        toast.success("Comentário publicado.");
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  };

  const likeComment = (comment: CommentOut) => {
    if (!me) {
      toast("Entre para curtir comentários.", {
        action: { label: "Entrar", onClick: () => window.location.assign("/login") },
      });
      return;
    }
    apiPost(`/comments/${comment.id}/like`)
      .then(invalidate)
      .catch((e) => toast.error(apiErrorMessage(e)));
  };

  const deleteComment = (comment: CommentOut) => {
    void apiDelete(`/comments/${comment.id}`)
      .then(() => {
        invalidate();
        toast.success("Comentário removido.");
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  };

  const all = comments.data ?? [];
  const parents = all.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, CommentOut[]>();
  for (const c of all) {
    if (c.parent_id) {
      repliesByParent.set(c.parent_id, [...(repliesByParent.get(c.parent_id) ?? []), c]);
    }
  }

  return (
    <div className="space-y-4" data-testid="comment-thread">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          {all.length} {all.length === 1 ? "comentário" : "comentários"}
        </p>
        <Select value={sort} onValueChange={(v: string) => setSort(v as SortMode)}>
          <SelectTrigger size="sm" className="w-44" data-testid="comments-sort-select" aria-label="Ordenar comentários">
            <SelectValue>
              {(v: string) => (v === "relevant" ? "Mais relevantes" : "Mais recentes")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevant">Mais relevantes</SelectItem>
            <SelectItem value="recent">Mais recentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {comments.isLoading ? (
        <p className="py-4 text-sm text-muted-foreground">Carregando comentários…</p>
      ) : comments.isError ? (
        <p className="py-4 text-sm text-muted-foreground">
          Não foi possível carregar os comentários agora.
        </p>
      ) : (
        <ul className="space-y-4">
          {parents.map((c) => (
            <li key={c.id} className="space-y-2">
              <CommentRow
                comment={c}
                me={me}
                onLike={() => likeComment(c)}
                onReply={() => setReplyTo(replyTo?.id === c.id ? null : c)}
                onDelete={() => deleteComment(c)}
              />
              {replyTo?.id === c.id && (
                <CommentBox
                  placeholder={`Responder a ${c.author_name}…`}
                  value={text}
                  onChange={setText}
                  onSubmit={() => submit(text, c.id)}
                  testid="comment-reply-input"
                />
              )}
              {repliesByParent.get(c.id) && (
                <ul className="ml-10 space-y-2 border-l border-border pl-4">
                  {repliesByParent.get(c.id)!.map((r) => (
                    <li key={r.id}>
                      <CommentRow comment={r} me={me} onLike={() => likeComment(r)} onDelete={() => deleteComment(r)} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          {parents.length === 0 && (
            <li className="text-sm text-muted-foreground">
              Nenhum comentário ainda. Seja a primeira pessoa a contribuir!
            </li>
          )}
        </ul>
      )}

      <CommentBox
        placeholder="Escreva um comentário…"
        value={text}
        onChange={setText}
        onSubmit={() => submit(text)}
        testid="comment-new-input"
      />
    </div>
  );
}

function CommentRow({
  comment,
  me,
  onLike,
  onReply,
  onDelete,
}: {
  comment: CommentOut;
  me: UserOut | null | undefined;
  onLike: () => void;
  onReply?: () => void;
  onDelete: () => void;
}) {
  const canDelete = !!me && (me.id === comment.author_id || me.role === "admin");
  return (
    <div className="flex gap-3">
      <Avatar name={comment.author_name} url={comment.author_avatar} className="h-8 w-8 text-xs" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{comment.author_name}</span> ·{" "}
          {timeAgo(comment.created_at)}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed">{comment.text}</p>
        <div className="mt-1 flex items-center gap-3">
          <button
            data-testid="comment-like-button"
            onClick={onLike}
            className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground",
              comment.liked_by_me && "font-semibold text-primary",
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {comment.likes_count > 0 ? comment.likes_count : "Curtir"}
          </button>
          {onReply && (
            <button
              data-testid="comment-reply-button"
              onClick={onReply}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CornerDownRight className="h-3.5 w-3.5" /> Responder
            </button>
          )}
          {canDelete && (
            <button
              data-testid="comment-delete-button"
              onClick={onDelete}
              aria-label="Excluir comentário"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentBox({
  placeholder,
  value,
  onChange,
  onSubmit,
  testid,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  testid: string;
}) {
  const { data: me } = useMe();
  return (
    <div className="flex items-start gap-3">
      <Avatar name={me?.name ?? "Você"} url={me?.avatar_url} className="h-8 w-8 text-xs" />
      <div className="flex flex-1 items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={me ? placeholder : "Entre para comentar…"}
          rows={2}
          data-testid={testid}
          aria-label="Escrever comentário"
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button size="sm" onClick={onSubmit} disabled={!value.trim()} data-testid="comment-submit-button">
          Enviar
        </Button>
      </div>
    </div>
  );
}
