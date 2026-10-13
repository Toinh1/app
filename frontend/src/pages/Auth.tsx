import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AudioWaveform, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorMessage, apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import type { MessageOut, UserOut } from "@/lib/types";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-[#263A29] p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-2" data-testid="auth-logo-link">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#556B2F]">
            <AudioWaveform className="h-5 w-5" />
          </span>
          <span className="font-heading text-lg font-black tracking-tighter">
            ADMINISTRE<span className="text-[#A3BD82]">-SE</span> CAST
          </span>
        </Link>
        <div className="max-w-md space-y-6">
          <Quote className="h-10 w-10 text-[#A3BD82]" />
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Conhecimento que conecta. Ideias que transformam.
          </h1>
          <p className="text-[#DCE5D0]">
            A rede acadêmica onde estudantes de Administração publicam videocasts, gravam podcasts,
            compartilham relatos e debatem o futuro da gestão.
          </p>
          <div className="flex gap-8 border-t border-white/15 pt-6 text-sm">
            <div>
              <p className="font-heading text-2xl font-bold">12</p>
              <p className="text-[#DCE5D0]">áreas da Administração</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-bold">4</p>
              <p className="text-[#DCE5D0]">formatos de conteúdo</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-[#DCE5D0]/70">
          Comunidade acadêmica · respeito, colaboração e troca de experiências
        </p>
      </div>
      <div className="flex items-center justify-center bg-background p-6 md:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const login = useMutation({
    mutationFn: () => apiPost<UserOut>("/auth/login", { email, password }),
    onSuccess: (user) => {
      beginSession();
      toast.success(`Bem-vindo(a), ${user.name.split(" ")[0]}!`);
      navigate(from, { replace: true });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const forgot = useMutation({
    mutationFn: () => apiPost<MessageOut>("/auth/forgot-password", { email: forgotEmail }),
    onSuccess: (res) => toast.success(res.message, { duration: 20000 }),
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const reset = useMutation({
    mutationFn: () => apiPost<MessageOut>("/auth/reset-password", { token: resetToken, new_password: newPassword }),
    onSuccess: (res) => {
      toast.success(res.message);
      setForgotOpen(false);
      setResetToken("");
      setNewPassword("");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl font-bold">Entrar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse sua conta para publicar, comentar e seguir criadores.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="login-email">E-mail</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@universidade.edu.br"
              data-testid="login-email-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Senha</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              data-testid="login-password-input"
            />
          </div>
          <Button type="submit" className="w-full" disabled={login.isPending} data-testid="login-submit-button">
            {login.isPending ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setForgotOpen(!forgotOpen)}
            className="text-muted-foreground underline-offset-4 hover:underline"
            data-testid="forgot-password-toggle"
          >
            Esqueci minha senha
          </button>
          <Link to="/cadastro" className="font-medium text-primary underline-offset-4 hover:underline" data-testid="go-to-register-link">
            Criar conta
          </Link>
        </div>

        {forgotOpen && (
          <div className="space-y-4 rounded-2xl border border-border bg-card p-4" data-testid="forgot-password-panel">
            <p className="text-sm font-semibold">Recuperar senha</p>
            <p className="text-xs text-muted-foreground">
              Informe seu e-mail para gerar um token de redefinição. Nesta versão o token aparece na
              própria tela (sem provedor de e-mail configurado).
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="seu e-mail"
                data-testid="forgot-email-input"
              />
              <Button
                variant="outline"
                onClick={() => forgot.mutate()}
                disabled={!forgotEmail.trim() || forgot.isPending}
                data-testid="forgot-submit-button"
              >
                Gerar token
              </Button>
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <Input
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Cole o token recebido"
                data-testid="reset-token-input"
              />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha (mín. 6 caracteres)"
                data-testid="reset-password-input"
              />
              <Button
                className="w-full"
                onClick={() => reset.mutate()}
                disabled={!resetToken.trim() || newPassword.length < 6 || reset.isPending}
                data-testid="reset-submit-button"
              >
                Redefinir senha
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Contas de demonstração</p>
          <p className="mt-1">Estudante: ana@demo.com · Demo@2025</p>
          <p>Administrador: admin@administrase.com · Admin@2025</p>
        </div>
      </div>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institution, setInstitution] = useState("");
  const [area, setArea] = useState("");

  const register = useMutation({
    mutationFn: () => apiPost<UserOut>("/auth/register", { name, email, password, institution, area }),
    onSuccess: (user) => {
      beginSession();
      toast.success(`Conta criada! Bem-vindo(a), ${user.name.split(" ")[0]}.`);
      navigate("/", { replace: true });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-3xl font-bold">Criar conta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Junte-se à comunidade de estudantes de Administração.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            register.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="register-name">Nome completo</Label>
            <Input
              id="register-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              data-testid="register-name-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email">E-mail</Label>
            <Input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@universidade.edu.br"
              data-testid="register-email-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">Senha</Label>
            <Input
              id="register-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              data-testid="register-password-input"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="register-institution">Instituição (opcional)</Label>
              <Input
                id="register-institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Sua universidade"
                data-testid="register-institution-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-area">Área de interesse (opcional)</Label>
              <Input
                id="register-area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ex.: Marketing"
                data-testid="register-area-input"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={register.isPending} data-testid="register-submit-button">
            {register.isPending ? "Criando conta…" : "Criar conta"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline" data-testid="go-to-login-link">
            Entrar
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
