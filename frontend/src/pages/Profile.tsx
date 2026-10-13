import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, GraduationCap, Inbox, Linkedin, ListMusic, UserRound } from "lucide-react";
import { Avatar, EmptyState, PageLoader, SkeletonGrid } from "@/components/common/states";
import { PublicationCard } from "@/components/content/PublicationCard";
import { FollowButton } from "@/components/content/dialogs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet } from "@/lib/api";
import { contentPath } from "@/lib/categories";
import { formatCount, formatDate } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { PlaylistOut, ProfileOut, PublicationList } from "@/lib/types";

const TABS = [
  { value: "all", label: "Tudo", type: "" },
  { value: "videocast", label: "Videocasts", type: "videocast" },
  { value: "podcast", label: "Podcasts", type: "podcast" },
  { value: "relato", label: "Relatos", type: "relato" },
  { value: "debate", label: "Debates", type: "debate" },
  { value: "playlists", label: "Playlists", type: "" },
  { value: "drafts", label: "Rascunhos", type: "" },
];

export default function Profile() {
  const { id = "" } = useParams();
  const { data: me } = useMe();
  const [tab, setTab] = useState("all");

  const profile = useQuery({
    queryKey: ["profile", id],
    queryFn: () => apiGet<ProfileOut>(`/users/${id}`),
    enabled: !!id,
    retry: false,
  });

  const isMe = !!me && me.id === id;
  const activeType = TABS.find((t) => t.value === tab)?.type ?? "";
  const isDrafts = tab === "drafts";

  const publications = useQuery({
    queryKey: ["user-publications", id, tab],
    queryFn: () =>
      apiGet<PublicationList>(
        `/users/${id}/publications?limit=24&status=${isDrafts ? "draft" : "published"}${activeType ? `&type=${activeType}` : ""}`,
      ),
    enabled: !!id && tab !== "playlists",
    retry: false,
  });

  const playlists = useQuery({
    queryKey: ["user-playlists", id],
    queryFn: () => apiGet<PlaylistOut[]>(`/users/${id}/playlists`),
    enabled: !!id && tab === "playlists",
    retry: false,
  });

  if (profile.isLoading) return <PageLoader />;
  if (profile.isError || !profile.data) {
    return (
      <EmptyState
        icon={UserRound}
        title="Perfil não encontrado"
        description="Este usuário pode ter sido removido da plataforma."
      />
    );
  }

  const p = profile.data;
  const visibleTabs = TABS.filter((t) => t.value !== "drafts" || isMe);
  const publicationItems = publications.data?.items ?? [];

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="h-28 bg-gradient-to-r from-[#263A29] via-[#3C5130] to-[#556B2F]" />
        <div className="px-5 pb-5 md:px-7 md:pb-7">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar
                name={p.name}
                url={p.avatar_url}
                className="h-24 w-24 border-4 border-card text-2xl"
              />
              <div className="pb-1">
                <h1 className="font-heading text-2xl font-bold" data-testid="profile-name">
                  {p.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {p.institution && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" /> {p.institution}
                    </span>
                  )}
                  {p.semester && (
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5" /> {p.semester}
                    </span>
                  )}
                  <span>Na plataforma desde {formatDate(p.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pb-1">
              {isMe ? (
                <Link to="/configuracoes" className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="profile-edit-link">
                  Editar perfil
                </Link>
              ) : (
                <FollowButton userId={p.id} initialFollowing={p.is_following} testid="profile-follow-button" />
              )}
            </div>
          </div>

          {p.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed">{p.bio}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {p.area && <Badge variant="secondary">{p.area}</Badge>}
            {p.role === "admin" && <Badge className="bg-[#263A29] text-white">Administração</Badge>}
            {p.linkedin && (
              <a
                href={p.linkedin.startsWith("http") ? p.linkedin : `https://${p.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="profile-linkedin-link"
                className="flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </a>
            )}
          </div>

          <div className="mt-5 flex gap-6 border-t border-border pt-4 text-sm">
            <span data-testid="profile-publications-count">
              <span className="font-heading text-lg font-bold">{formatCount(p.publications_count)}</span>{" "}
              <span className="text-muted-foreground">publicações</span>
            </span>
            <span data-testid="profile-followers-count">
              <span className="font-heading text-lg font-bold">{formatCount(p.followers_count)}</span>{" "}
              <span className="text-muted-foreground">seguidores</span>
            </span>
            <span data-testid="profile-following-count">
              <span className="font-heading text-lg font-bold">{formatCount(p.following_count)}</span>{" "}
              <span className="text-muted-foreground">seguindo</span>
            </span>
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={(v: string) => setTab(v)}>
        <TabsList variant="line" data-testid="profile-tabs" className="flex-wrap">
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} data-testid={`profile-tab-${t.value}`}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="pt-6">
            {t.value === "playlists" ? (
              playlists.isLoading ? (
                <SkeletonGrid count={3} />
              ) : (playlists.data?.length ?? 0) === 0 ? (
                <EmptyState icon={ListMusic} title="Nenhuma playlist pública" />
              ) : (
                <div className="space-y-4" data-testid="profile-playlists">
                  {playlists.data!.map((playlist) => (
                    <div key={playlist.id} className="rounded-2xl border border-border bg-card p-4">
                      <p className="font-heading text-sm font-bold">{playlist.title}</p>
                      <p className="text-xs text-muted-foreground">{playlist.items.length} itens</p>
                      <ul className="mt-2 space-y-1">
                        {playlist.items.slice(0, 5).map((item) => (
                          <li key={item.id}>
                            <Link to={contentPath(item)} className="text-sm hover:underline">
                              {item.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )
            ) : publications.isLoading ? (
              <SkeletonGrid count={4} />
            ) : publicationItems.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={t.value === "drafts" ? "Nenhum rascunho salvo" : "Nenhuma publicação nesta aba"}
                description={
                  isMe ? "Grave ou escreva um conteúdo no estúdio para publicá-lo aqui." : undefined
                }
                action={
                  isMe ? (
                    <Link to="/estudio" className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Ir ao estúdio
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" data-testid="profile-publications">
                {publicationItems.map((pub) => (
                  <PublicationCard key={pub.id} pub={pub} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
