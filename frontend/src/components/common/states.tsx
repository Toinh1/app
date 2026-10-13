import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export function Avatar({ name, url, className }: { name: string; url?: string; className?: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={`Foto de ${name}`}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      aria-label={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-heading font-bold text-primary-foreground",
        className,
      )}
    >
      {initials(name || "?")}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-heading text-base font-bold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-40 items-center justify-center" data-testid="page-loader">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando" />
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      data-testid="error-box"
      className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center"
    >
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="aspect-video w-full animate-pulse rounded-xl bg-muted" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
