import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LogOut, Settings as SettingsIcon, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/common/states";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage, apiPatch, apiPost } from "@/lib/api";
import { endSession, useMe } from "@/lib/session";
import type { MessageOut, UserOut } from "@/lib/types";

const PRIVACY_KEY = "asc:privacy-prefs";

interface PrivacyPrefs {
  showInstitution: boolean;
  showSemester: boolean;
  showLinkedin: boolean;
}

export default function Settings() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [institution, setInstitution] = useState("");
  const [area, setArea] = useState("");
  const [semester, setSemester] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [privacy, setPrivacy] = useState<PrivacyPrefs>({
    showInstitution: true,
    showSemester: true,
    showLinkedin: true,
  });

  useEffect(() => {
    if (!me) return;
    setName(me.name);
    setBio(me.bio);
    setInstitution(me.institution);
    setArea(me.area);
    setSemester(me.semester);
    setLinkedin(me.linkedin);
    setAvatarUrl(me.avatar_url);
  }, [me]);

  useEffect(() => {
    const raw = window.localStorage.getItem(PRIVACY_KEY);
    if (raw) {
      try {
        setPrivacy(JSON.parse(raw) as PrivacyPrefs);
      } catch {
        /* ignore malformed cache */
      }
    }
  }, []);

  const saveProfile = useMutation({
    mutationFn: () =>
      apiPatch<UserOut>("/users/me", {
        name,
        bio,
        institution: privacy.showInstitution ? institution : "",
        area,
        semester: privacy.showSemester ? semester : "",
        linkedin: privacy.showLinkedin ? linkedin : "",
        avatar_url: avatarUrl,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil atualizado.");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      apiPost<MessageOut>("/users/me/password", {
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: (res) => {
      toast.success(res.message);
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const updatePrivacy = (next: PrivacyPrefs) => {
    setPrivacy(next);
    window.localStorage.setItem(PRIVACY_KEY, JSON.stringify(next));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold">
          <SettingsIcon className="h-6 w-6 text-primary" /> Configurações da conta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seus dados, senha, privacidade e aparência da plataforma.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold">
          <UserRound className="h-4 w-4" /> Perfil público
        </h2>

        <div className="flex items-center gap-4">
          <Avatar name={name || me?.name || "Você"} url={avatarUrl} className="h-16 w-16 text-lg" />
          <div className="flex-1 space-y-2">
            <Label htmlFor="settings-avatar">URL da foto de perfil</Label>
            <Input
              id="settings-avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              data-testid="settings-avatar-input"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Nome</Label>
            <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="settings-name-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-area">Área de interesse</Label>
            <Input
              id="settings-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Ex.: Marketing"
              data-testid="settings-area-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-institution">Instituição de ensino</Label>
            <Input
              id="settings-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              data-testid="settings-institution-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-semester">Semestre (opcional)</Label>
            <Input
              id="settings-semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="Ex.: 5º semestre"
              data-testid="settings-semester-input"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-linkedin">LinkedIn (opcional)</Label>
          <Input
            id="settings-linkedin"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="linkedin.com/in/seu-perfil"
            data-testid="settings-linkedin-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-bio">Biografia</Label>
          <Textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Conte quem você é e o que estuda…"
            data-testid="settings-bio-input"
          />
        </div>

        <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} data-testid="settings-save-button">
          {saveProfile.isPending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold">
          <ShieldCheck className="h-4 w-4" /> Privacidade
        </h2>
        <p className="text-sm text-muted-foreground">
          Escolha o que aparece no seu perfil público. Seu e-mail nunca é exibido para outros usuários.
        </p>
        <div className="space-y-3">
          {(
            [
              ["showInstitution", "Exibir minha instituição de ensino"],
              ["showSemester", "Exibir meu semestre"],
              ["showLinkedin", "Exibir meu LinkedIn"],
            ] as [keyof PrivacyPrefs, string][]
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={privacy[key]}
                onCheckedChange={(checked) => updatePrivacy({ ...privacy, [key]: checked === true })}
                data-testid={`privacy-${key}`}
              />
              {label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          As preferências são aplicadas ao salvar o perfil — os campos ocultos são removidos dos dados
          públicos.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold">
          <KeyRound className="h-4 w-4" /> Alterar senha
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="settings-current-password">Senha atual</Label>
            <Input
              id="settings-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-testid="settings-current-password-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-new-password">Nova senha</Label>
            <Input
              id="settings-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              data-testid="settings-new-password-input"
            />
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => changePassword.mutate()}
          disabled={!currentPassword || newPassword.length < 6 || changePassword.isPending}
          data-testid="settings-change-password-button"
        >
          Alterar senha
        </Button>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-base font-bold">Aparência</h2>
        <ThemeToggle />
      </section>

      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="font-heading text-base font-bold">Sessão</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Encerre sua sessão neste dispositivo. Seus conteúdos permanecem publicados.
        </p>
        <Button
          variant="destructive"
          className="mt-3 gap-2"
          data-testid="settings-logout-button"
          onClick={async () => {
            await endSession();
            toast.success("Sessão encerrada.");
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4" /> Sair da conta
        </Button>
      </section>
    </div>
  );
}
