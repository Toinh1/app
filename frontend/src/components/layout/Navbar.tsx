import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Plus, Search, Settings, ShieldCheck, CircleUserRound } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "./Logo";
import { Avatar } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiGet, apiPost } from "@/lib/api";
import { contentPath } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { endSession, useMe } from "@/lib/session";
import type { NotificationList, NotificationOut, SearchResults } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, string> = {
  videocast: "▶",
  podcast: "🎧",
  relato: "💬",
  debate: "⚖️",
};

function notificationTargetPath(n: NotificationOut): string {
  if (n.type === "follow" && n.actor_id) return `/perfil/${n.actor_id}`;
  if (!n.publication_id) return "/";
  switch (n.publication_type) {
    case "videocast":
      return `/video/${n.publication_id}`;
    case "relato":
      return "/relatos";
    case "debate":
      return "/debates";
    default:
      return "/podcasts";
  }
}

export default function Navbar() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const suggestions = useQuery({
    queryKey: ["search-suggest", debounced],
    queryFn: () => apiGet<SearchResults>(`/search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<NotificationList>("/notifications"),
    enabled: !!me,
    refetchInterval: 30_000,
  });
  const { refetch: refetchNotifications } = notifications;

  const markAllMutation = useMutation({
    mutationFn: () => apiPost("/notifications/read-all"),
    onSuccess: () => {
      void refetchNotifications();
    },
  });
  const markOne = useMutation({
    mutationFn: (id: string) => apiPost(`/notifications/${id}/read`),
    onSuccess: () => {
      void refetchNotifications();
    },
  });

  const unread = notifications.data?.unread ?? 0;
  const hasResults =
    !!suggestions.data &&
    (suggestions.data.publications.length > 0 ||
      suggestions.data.creators.length > 0 ||
      suggestions.data.categories.length > 0);

  const handleLogout = async () => {
    await endSession();
    toast.success("Sessão encerrada. Até logo!");
    navigate("/login");
  };

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSearchOpen(false);
    navigate(`/explorar?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-xl md:px-8">
      <div className="md:hidden">
        <Logo />
      </div>

      <div className="relative hidden w-full max-w-xl md:block">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch();
          }}
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Buscar vídeos, podcasts, relatos, debates e criadores…"
            aria-label="Buscar na plataforma"
            data-testid="search-input"
            className="rounded-full border-[#DCE5D0] bg-[#EDF2E8] pl-10 dark:border-[#28392A] dark:bg-[#1E2B20]"
          />
        </form>
        {searchOpen && debounced.length >= 2 && (
          <div
            data-testid="search-suggestions"
            className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg"
          >
            {suggestions.isLoading ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Buscando…</p>
            ) : hasResults && suggestions.data ? (
              <div className="max-h-96 overflow-y-auto p-2">
                {suggestions.data.publications.length > 0 && (
                  <div>
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Conteúdos
                    </p>
                    {suggestions.data.publications.slice(0, 5).map((pub) => (
                      <button
                        key={pub.id}
                        data-testid="search-suggestion-item"
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                          navigate(contentPath(pub));
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
                      >
                        <span className="text-base">{TYPE_ICONS[pub.type] ?? "▶"}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{pub.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {pub.author_name}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {suggestions.data.creators.length > 0 && (
                  <div>
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Criadores
                    </p>
                    {suggestions.data.creators.map((c) => (
                      <button
                        key={c.id}
                        data-testid="search-suggestion-creator"
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                          navigate(`/perfil/${c.id}`);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
                      >
                        <Avatar name={c.name} url={c.avatar_url} className="h-7 w-7 text-xs" />
                        <span className="truncate text-sm font-medium">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {suggestions.data.categories.length > 0 && (
                  <div>
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Categorias
                    </p>
                    {suggestions.data.categories.map((c) => (
                      <button
                        key={c.id}
                        data-testid="search-suggestion-category"
                        onClick={() => {
                          setSearchOpen(false);
                          setQuery("");
                          navigate(`/videocasts?category=${encodeURIComponent(c.name)}`);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
                      >
                        <span className="text-base">🏷</span>
                        <span className="truncate text-sm font-medium">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Nenhum resultado para “{debounced}”.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          data-testid="create-publication-button"
          onClick={() => navigate(me ? "/estudio" : "/login")}
          className="gap-2 rounded-full"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Criar</span>
        </Button>

        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                data-testid="notifications-button"
                aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
                className="relative rounded-full"
              >
                <Bell className="h-5 w-5" />
                {me && unread > 0 && (
                  <span
                    data-testid="notifications-unread-badge"
                    className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                  >
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-96 p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-heading text-sm font-bold">Notificações</p>
              {me && unread > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  data-testid="notifications-mark-all"
                  onClick={() => markAllMutation.mutate()}
                >
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto" data-testid="notifications-list">
              {!me ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Entre para acompanhar curtidas, comentários e novos seguidores.
                </p>
              ) : notifications.isLoading ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Carregando…</p>
              ) : (notifications.data?.items.length ?? 0) === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma notificação por enquanto.
                </p>
              ) : (
                notifications.data!.items.map((n) => (
                  <button
                    key={n.id}
                    data-testid="notification-item"
                    onClick={() => {
                      if (!n.read) markOne.mutate(n.id);
                      setNotifOpen(false);
                      navigate(notificationTargetPath(n));
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left hover:bg-muted",
                      !n.read && "bg-[#EDF2E8]/50 dark:bg-[#263A29]/40",
                    )}
                  >
                    <Avatar name={n.actor_name} url={n.actor_avatar} className="h-8 w-8 text-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug">{n.text}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                data-testid="user-menu-button"
                aria-label="Menu do usuário"
                className="flex items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {me ? (
                  <Avatar name={me.name} url={me.avatar_url} className="h-9 w-9 text-sm" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <CircleUserRound className="h-5 w-5 text-muted-foreground" />
                  </span>
                )}
              </button>
            }
          />
          <DropdownMenuContent align="end">
            {me ? (
              <>
                <DropdownMenuItem onClick={() => navigate(`/perfil/${me.id}`)} data-testid="menu-my-profile">
                  <CircleUserRound className="h-4 w-4" /> Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/configuracoes")} data-testid="menu-settings">
                  <Settings className="h-4 w-4" /> Configurações
                </DropdownMenuItem>
                {me.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                    <ShieldCheck className="h-4 w-4" /> Painel admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout} variant="destructive" data-testid="menu-logout">
                  <LogOut className="h-4 w-4" /> Sair
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={() => navigate("/login")} data-testid="menu-login">
                  Entrar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/cadastro")} data-testid="menu-register">
                  Criar conta
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
