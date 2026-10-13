import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Flag, MessagesSquare, Plus, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState, SkeletonGrid } from "@/components/common/states";
import { CommentThread } from "@/components/content/CommentThread";
import { DebateFormDialog, ReportDialog } from "@/components/content/dialogs";
import { useLikeSave } from "@/components/content/useLikeSave";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiErrorMessage, apiGet, apiPatch } from "@/lib/api";
import { formatCount, timeAgo } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { PublicationList, PublicationOut } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "trending", label: "Mais debatidos" },
  { value: "recent", label: "Recentes" },
];

// "Mesa de Ideias" — academic debates with threaded contributions.
export default function Debates() {
  const { data: me } = useMe();
  const [sort, setSort] = useState("trending");
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);

  const debates = useQuery({
    queryKey: ["publications", "debate", sort, page],
    queryFn: () => apiGet<PublicationList>(`/publications?type=debate&tab=${sort}&page=${page}&limit=10`),
    retry: false,
  });

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-[#263A29] p-7 text-white md:p-10">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A3BD82]">
          <MessagesSquare className="h-4 w-4" /> Mesa de Ideias
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold md:text-4xl">Debates acadêmicos</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#DCE5D0]">
          Teses, perguntas e provocações sobre o futuro da Administração. Contribua com argumentos,
          responda colegas e acompanhe as discussões até a conclusão.
        </p>
        <Button
          onClick={() => {
            if (!me) {
              toast("Entre para criar um debate.", { action: { label: "Entrar", onClick: () => window.location.assign("/login") } });
              return;
            }
            setCreateOpen(true);
          }}
          data-testid="create-debate-button"
          className="mt-6 gap-2 bg-[#DCE5D0] text-[#263A29] hover:bg-white"
        >
          <Plus className="h-4 w-4" /> Criar novo debate
        </Button>
      </section>

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
            data-testid={`debates-sort-${s.value}`}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {debates.isLoading ? (
        <SkeletonGrid count={4} />
      ) : debates.isError ? (
        <EmptyState icon={MessagesSquare} title="Não foi possível carregar os debates" description="Tente novamente em instantes." />
      ) : (debates.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Nenhum debate aberto"
          description="Lance a primeira pergunta e convide a comunidade a discutir."
        />
      ) : (
        <>
          <div className="space-y-5" data-testid="debates-list">
            {debates.data!.items.map((pub) => (
              <DebateCard key={pub.id} pub={pub} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3">
            {page > 1 && (
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} data-testid="debates-prev">
                Anterior
              </Button>
            )}
            {debates.data?.has_more && (
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} data-testid="debates-next">
                Carregar mais
              </Button>
            )}
          </div>
        </>
      )}

      <DebateFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function DebateCard({ pub }: { pub: PublicationOut }) {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const { liked, likesCount, toggleLike, share } = useLikeSave(pub);
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isOwner = !!me && (me.id === pub.author_id || me.role === "admin");

  const toggleResolved = useMutation({
    mutationFn: () => apiPatch<PublicationOut>(`/publications/${pub.id}`, { resolved: !pub.resolved }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["publications"] });
      toast.success(updated.resolved ? "Debate marcado como encerrado." : "Debate reaberto.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <article
      data-testid={`debate-card-${pub.id}`}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div className="flex flex-wrap items-center gap-2">
        {pub.category && <Badge variant="secondary">{pub.category}</Badge>}
        {pub.resolved && (
          <Badge className="gap-1 bg-[#2D6A4F] text-white">
            <CheckCircle2 className="h-3 w-3" /> Encerrado
          </Badge>
        )}
        {pub.is_demo && (
          <Badge variant="outline" className="border-dashed text-muted-foreground">
            Demo
          </Badge>
        )}
      </div>

      <h2 className="mt-3 font-heading text-lg font-bold leading-snug">{pub.title}</h2>
      <p className={cn("mt-2 text-sm leading-relaxed text-muted-foreground", !open && "line-clamp-3")}>
        {pub.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Avatar name={pub.author_name} url={pub.author_avatar} className="h-8 w-8 text-xs" />
          <span className="text-xs">
            <span className="block font-medium">{pub.author_name}</span>
            <span className="block text-muted-foreground">{timeAgo(pub.created_at)}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={toggleLike}
            aria-pressed={liked}
            data-testid={`debate-like-${pub.id}`}
            className={cn("gap-1.5 text-muted-foreground", liked && "text-primary")}
          >
            <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
            {formatCount(likesCount)}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setOpen(!open)}
            data-testid={`debate-toggle-${pub.id}`}
            className="gap-1.5 text-muted-foreground"
          >
            <MessagesSquare className="h-4 w-4" />
            {pub.comments_count} {pub.comments_count === 1 ? "contribuição" : "contribuições"}
          </Button>
          <Button variant="ghost" size="xs" onClick={share} data-testid={`debate-share-${pub.id}`} className="text-muted-foreground">
            Compartilhar
          </Button>
          {isOwner && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => toggleResolved.mutate()}
              disabled={toggleResolved.isPending}
              data-testid={`debate-resolve-${pub.id}`}
              className="text-muted-foreground"
            >
              {pub.resolved ? "Reabrir" : "Marcar como resolvido"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setReportOpen(true)}
            aria-label="Denunciar debate"
            data-testid={`debate-report-${pub.id}`}
            className="text-muted-foreground"
          >
            <Flag className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 border-t border-border pt-4">
          <CommentThread publicationId={pub.id} />
        </div>
      )}

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetId={pub.id} targetType="publication" targetLabel={pub.title} />
    </article>
  );
}
