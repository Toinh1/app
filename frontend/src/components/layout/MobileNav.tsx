import { NavLink } from "react-router-dom";
import { Compass, Home, LibraryBig, PlusCircle, CircleUserRound } from "lucide-react";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

// Mobile bottom navigation: Início, Explorar, Criar, Biblioteca e Perfil.
export default function MobileNav() {
  const { data: me } = useMe();

  const items = [
    { to: "/", icon: Home, label: "Início", testid: "mobile-nav-inicio" },
    { to: "/explorar", icon: Compass, label: "Explorar", testid: "mobile-nav-explorar" },
    { to: "/estudio", icon: PlusCircle, label: "Criar", testid: "mobile-nav-criar", primary: true },
    { to: "/biblioteca", icon: LibraryBig, label: "Biblioteca", testid: "mobile-nav-biblioteca" },
    {
      to: me ? `/perfil/${me.id}` : "/login",
      icon: CircleUserRound,
      label: "Perfil",
      testid: "mobile-nav-perfil",
    },
  ];

  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card/95 px-2 backdrop-blur-lg md:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-[11px] transition-colors",
              isActive && !item.primary
                ? "font-semibold text-primary"
                : "text-muted-foreground",
            )
          }
          data-testid={item.testid}
        >
          <item.icon className={cn("h-5 w-5", item.primary && "text-primary")} strokeWidth={item.primary ? 2.4 : 2} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
