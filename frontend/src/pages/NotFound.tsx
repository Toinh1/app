import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center" data-testid="not-found">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Compass className="h-7 w-7 text-muted-foreground" />
      </span>
      <h1 className="font-heading text-2xl font-bold">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        O endereço que você acessou não existe ou foi movido. Volte ao início para continuar
        explorando a plataforma.
      </p>
      <Link to="/" className={buttonVariants()} data-testid="not-found-home-link">
        Voltar ao início
      </Link>
    </div>
  );
}
