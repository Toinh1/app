import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bookmark,
  CircleUserRound,
  Compass,
  Home,
  LibraryBig,
  LayoutGrid,
  LogOut,
  MessageSquareHeart,
  MessagesSquare,
  MonitorPlay,
  Podcast,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "./Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";
import { endSession, useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

const MAIN_NAV = [
  { to: "/", icon: Home, label: "Início", testid: "nav-inicio", end: true },
  { to: "/explorar", icon: Compass, label: "Explorar conteúdos", testid: "nav-explorar" },
  { to: "/videocasts", icon: MonitorPlay, label: "Videocasts", testid: "nav-videocasts" },
  { to: "/podcasts", icon: Podcast, label: "Podcasts", testid: "nav-podcasts" },
  { to: "/relatos", icon: MessageSquareHeart, label: "Relatos da comunidade", testid: "nav-relatos" },
  { to: "/debates", icon: MessagesSquare, label: "Debates", testid: "nav-debates" },
  { to: "/explorar?secao=categorias", icon: LayoutGrid, label: "Categorias", testid: "nav-categorias" },
];

const LIBRARY_NAV = [
  { to: "/biblioteca?tab=favoritos", icon: Bookmark, label: "Favoritos", testid: "nav-favoritos" },
  { to: "/biblioteca", icon: LibraryBig, label: "Minha biblioteca", testid: "nav-biblioteca" },
];

export default function Sidebar() {
  const { data: me } = useMe();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await endSession();
    toast.success("Sessão encerrada. Até logo!");
    navigate("/login");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-[#EDF2E8] font-semibold text-[#263A29] dark:bg-[#263A29] dark:text-[#DCE5D0]"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <aside
      data-testid="sidebar"
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card px-4 py-5 md:flex"
    >
      <div className="px-1">
        <Logo />
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {MAIN_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} data-testid={item.testid}>
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-5 border-t border-border pt-4">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sua biblioteca
        </p>
        <nav className="flex flex-col gap-1">
          {LIBRARY_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} data-testid={item.testid}>
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to={me ? `/perfil/${me.id}` : "/login"}
            className={linkClass}
            data-testid="nav-perfil"
          >
            <CircleUserRound className="h-[18px] w-[18px]" />
            Meu perfil
          </NavLink>
        </nav>
      </div>

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        {me?.role === "admin" && (
          <NavLink to="/admin" className={linkClass} data-testid="nav-admin">
            <ShieldCheck className="h-[18px] w-[18px]" />
            Painel admin
          </NavLink>
        )}
        <NavLink to="/configuracoes" className={linkClass} data-testid="nav-configuracoes">
          <Settings className="h-[18px] w-[18px]" />
          Configurações
        </NavLink>
        <ThemeToggle />
        {me ? (
          <button
            data-testid="sidebar-logout-button"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sair
          </button>
        ) : (
          <div className="flex flex-col gap-2 px-1 pt-2">
            <Link to="/login" data-testid="sidebar-login-link" className={buttonVariants({ size: "sm" })}>
              Entrar
            </Link>
            <Link
              to="/cadastro"
              data-testid="sidebar-register-link"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Criar conta
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
