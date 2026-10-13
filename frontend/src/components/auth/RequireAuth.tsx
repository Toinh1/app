import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMe } from "@/lib/session";
import { PageLoader } from "@/components/common/states";

// Gate for private pages: unauthenticated visitors land on /login and return
// to where they were after signing in.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  const location = useLocation();

  if (isLoading) return <PageLoader />;
  if (!me) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
}

// Gate for /admin: requires a session AND the admin role.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();
  const location = useLocation();

  if (isLoading) return <PageLoader />;
  if (!me) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (me.role !== "admin") {
    return (
      <div
        data-testid="admin-access-denied"
        className="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-card p-8 text-center"
      >
        <p className="font-heading text-lg font-bold">Acesso restrito</p>
        <p className="mt-2 text-sm text-muted-foreground">
          O painel administrativo é exclusivo para administradores da plataforma.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
