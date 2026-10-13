import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  FileText,
  Flag,
  MessagesSquare,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, EmptyState, PageLoader } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiDelete, apiErrorMessage, apiGet, apiPost } from "@/lib/api";
import { contentPath } from "@/lib/categories";
import { formatCount, formatDate } from "@/lib/format";
import type {
  AdminOverview,
  AdminUserOut,
  CategoryOut,
  PublicationOut,
  ReportOut,
} from "@/lib/types";

export default function Admin() {
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState("");
  const [confirm, setConfirm] = useState<{ kind: "publication" | "category"; id: string; label: string } | null>(null);

  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => apiGet<AdminOverview>("/admin/overview"),
    retry: false,
  });
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiGet<AdminUserOut[]>("/admin/users"),
    retry: false,
  });
  const reports = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => apiGet<ReportOut[]>("/admin/reports"),
    retry: false,
  });
  const publications = useQuery({
    queryKey: ["admin-publications"],
    queryFn: () => apiGet<PublicationOut[]>("/admin/publications"),
    retry: false,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiGet<CategoryOut[]>("/categories"),
    retry: false,
  });

  const invalidateAll = () => {
    for (const key of ["admin-overview", "admin-users", "admin-reports", "admin-publications", "categories"]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const suspend = useMutation({
    mutationFn: (userId: string) => apiPost<{ message: string }>(`/admin/users/${userId}/suspend`),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const resolveReport = useMutation({
    mutationFn: (reportId: string) => apiPost<{ message: string }>(`/admin/reports/${reportId}/resolve`),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(res.message);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const removePublication = useMutation({
    mutationFn: (pubId: string) => apiDelete(`/publications/${pubId}`),
    onSuccess: () => {
      invalidateAll();
      setConfirm(null);
      toast.success("Conteúdo removido da plataforma.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const createCategory = useMutation({
    mutationFn: () => apiPost<CategoryOut>("/categories", { name: newCategory }),
    onSuccess: () => {
      setNewCategory("");
      invalidateAll();
      toast.success("Categoria criada.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const deleteCategory = useMutation({
    mutationFn: (categoryId: string) => apiDelete(`/categories/${categoryId}`),
    onSuccess: () => {
      invalidateAll();
      setConfirm(null);
      toast.success("Categoria removida.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  if (overview.isLoading) return <PageLoader />;

  const metrics = [
    { label: "Usuários", value: overview.data?.users_count ?? 0, icon: Users },
    { label: "Publicações", value: overview.data?.publications_count ?? 0, icon: FileText },
    { label: "Comentários", value: overview.data?.comments_count ?? 0, icon: MessagesSquare },
    { label: "Debates", value: overview.data?.debates_count ?? 0, icon: MessagesSquare },
    { label: "Denúncias abertas", value: overview.data?.open_reports ?? 0, icon: Flag },
    { label: "Visualizações", value: overview.data?.total_views ?? 0, icon: Eye },
  ];

  return (
    <div className="space-y-7">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" /> Painel administrativo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Moderação de conteúdos, gestão de usuários, categorias e métricas da plataforma.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" data-testid="admin-metrics">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-4">
            <m.icon className="h-4 w-4 text-primary" />
            <p className="mt-2 font-heading text-2xl font-bold">{formatCount(m.value)}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="reports">
        <TabsList variant="line" data-testid="admin-tabs" className="flex-wrap">
          <TabsTrigger value="reports" data-testid="admin-tab-reports">
            Denúncias
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">
            Usuários
          </TabsTrigger>
          <TabsTrigger value="content" data-testid="admin-tab-content">
            Conteúdos
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="admin-tab-categories">
            Categorias
          </TabsTrigger>
          <TabsTrigger value="rules" data-testid="admin-tab-rules">
            Regras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="pt-6">
          {(reports.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Flag} title="Nenhuma denúncia registrada" description="A fila de moderação está vazia." />
          ) : (
            <div className="space-y-3" data-testid="admin-reports-list">
              {reports.data!.map((report) => (
                <div key={report.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={report.status === "open" ? "destructive" : "secondary"}>
                      {report.status === "open" ? "Aberta" : "Resolvida"}
                    </Badge>
                    <Badge variant="outline">{report.reason}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(report.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">{report.target_type === "publication" ? "Conteúdo" : report.target_type === "comment" ? "Comentário" : "Usuário"}:</span>{" "}
                    {report.target_title || report.target_id}
                  </p>
                  {report.details && <p className="mt-1 text-sm text-muted-foreground">{report.details}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">Denunciado por {report.reporter_name}</p>
                  {report.status === "open" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveReport.mutate(report.id)}
                        data-testid={`admin-resolve-report-${report.id}`}
                      >
                        Marcar como resolvida
                      </Button>
                      {report.target_type === "publication" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setConfirm({ kind: "publication", id: report.target_id, label: report.target_title })
                          }
                          data-testid={`admin-remove-reported-${report.id}`}
                        >
                          Remover conteúdo
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="pt-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table data-testid="admin-users-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead>Publicações</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users.data ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link to={`/perfil/${u.id}`} className="flex items-center gap-2 hover:underline">
                        <Avatar name={u.name} url={u.avatar_url} className="h-7 w-7 text-xs" />
                        <span>
                          <span className="block text-sm font-medium">{u.name}</span>
                          <span className="block text-xs text-muted-foreground">{u.email}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.institution || "—"}</TableCell>
                    <TableCell className="text-sm">{u.publications_count}</TableCell>
                    <TableCell>
                      {u.role === "admin" ? (
                        <Badge className="bg-[#263A29] text-white">Admin</Badge>
                      ) : u.suspended ? (
                        <Badge variant="destructive">Suspenso</Badge>
                      ) : (
                        <Badge variant="secondary">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role !== "admin" && (
                        <Button
                          size="xs"
                          variant={u.suspended ? "outline" : "destructive"}
                          onClick={() => suspend.mutate(u.id)}
                          data-testid={`admin-suspend-${u.id}`}
                        >
                          {u.suspended ? "Reativar" : "Suspender"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="content" className="pt-6">
          <div className="space-y-2" data-testid="admin-content-list">
            {(publications.data ?? []).map((pub) => (
              <div key={pub.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <Link to={contentPath(pub)} className="truncate text-sm font-medium hover:underline">
                    {pub.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {pub.type} · {pub.author_name} · {formatCount(pub.views)} views · {formatDate(pub.created_at)}
                  </p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setConfirm({ kind: "publication", id: pub.id, label: pub.title })}
                  aria-label={`Remover ${pub.title}`}
                  data-testid={`admin-delete-publication-${pub.id}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nome da nova categoria"
                data-testid="admin-new-category-input"
              />
              <Button
                onClick={() => createCategory.mutate()}
                disabled={!newCategory.trim() || createCategory.isPending}
                data-testid="admin-create-category-button"
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Criar
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="admin-categories-list">
              {(categories.data ?? []).map((category) => (
                <div key={category.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{category.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {category.publications_count} conteúdos
                    </span>
                  </span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => setConfirm({ kind: "category", id: category.id, label: category.name })}
                    aria-label={`Remover categoria ${category.name}`}
                    data-testid={`admin-delete-category-${category.id}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="pt-6">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-heading text-base font-bold">Regras da comunidade</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Respeito acima de tudo: nenhum tipo de assédio, discriminação ou ataque pessoal.</li>
              <li>Nada de spam, divulgação enganosa ou conteúdo repetitivo sem valor acadêmico.</li>
              <li>Publique apenas conteúdo próprio ou devidamente creditado — direitos autorais são respeitados.</li>
              <li>Informações pessoais de terceiros não podem ser divulgadas.</li>
              <li>Debates são bem-vindos; agressões não. Critique ideias, não pessoas.</li>
              <li>Conteúdo que viole estas regras pode ser removido e a conta suspensa.</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              Qualquer usuário pode denunciar conteúdos pelo ícone de bandeira — as denúncias chegam à
              aba Denúncias deste painel.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent data-testid="admin-confirm-dialog">
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === "publication" ? "Remover conteúdo?" : "Remover categoria?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            “{confirm?.label}” será removido permanentemente. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              data-testid="admin-confirm-delete-button"
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === "publication") removePublication.mutate(confirm.id);
                else deleteCategory.mutate(confirm.id);
              }}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
