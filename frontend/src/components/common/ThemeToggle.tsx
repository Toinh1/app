import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ withLabel = true }: { withLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size={withLabel ? "sm" : "icon"}
      data-testid="theme-toggle"
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={withLabel ? "justify-start gap-2 text-muted-foreground" : ""}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {withLabel && (isDark ? "Modo claro" : "Modo escuro")}
    </Button>
  );
}
