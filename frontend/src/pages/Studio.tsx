import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CircleStop,
  FileAudio,
  Mic,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { CategorySelect, ProgramFormDialog } from "@/components/content/dialogs";
import { useMediaRecorder } from "@/components/studio/useMediaRecorder";
import type { RecorderKind } from "@/components/studio/useMediaRecorder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorMessage, apiGet, apiPost, apiUpload } from "@/lib/api";
import { formatDuration } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { ProgramOut, PublicationOut, UploadOut } from "@/lib/types";

type PublishKind = "videocast" | "podcast" | "relato";

const PUBLISH_LABELS: Record<PublishKind, string> = {
  videocast: "Videocast",
  podcast: "Episódio de podcast",
  relato: "Relato da comunidade",
};

export default function Studio() {
  const { data: me } = useMe();
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-[#263A29] p-7 text-white md:p-10">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#A3BD82]">
          <Mic className="h-4 w-4" /> Meu Estúdio
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold md:text-4xl">Produza direto do navegador</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#DCE5D0]">
          Grave áudio ou vídeo usando o microfone e a câmera do seu dispositivo, ou envie um arquivo
          já pronto. Revise a prévia antes de publicar — nada vai ao ar sem a sua confirmação.
        </p>
        {me && (
          <p className="mt-4 text-xs text-[#DCE5D0]/80">
            Publicando como <span className="font-semibold">{me.name}</span>
          </p>
        )}
      </section>

      <Tabs defaultValue="audio">
        <TabsList data-testid="studio-tabs" className="w-full max-w-full overflow-x-auto">
          <TabsTrigger value="audio" data-testid="studio-tab-audio">
            <Mic className="mr-1.5 h-4 w-4" /> Gravar áudio
          </TabsTrigger>
          <TabsTrigger value="video" data-testid="studio-tab-video">
            <Video className="mr-1.5 h-4 w-4" /> Gravar vídeo
          </TabsTrigger>
          <TabsTrigger value="upload" data-testid="studio-tab-upload">
            <Upload className="mr-1.5 h-4 w-4" /> Enviar arquivo
          </TabsTrigger>
          <TabsTrigger value="texto" data-testid="studio-tab-texto">
            <PenLine className="mr-1.5 h-4 w-4" /> Escrever relato
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audio" className="pt-6">
          <RecorderPanel kind="audio" />
        </TabsContent>
        <TabsContent value="video" className="pt-6">
          <RecorderPanel kind="video" />
        </TabsContent>
        <TabsContent value="upload" className="pt-6">
          <UploadPanel />
        </TabsContent>
        <TabsContent value="texto" className="pt-6">
          <TextRelatoPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecorderPanel({ kind }: { kind: RecorderKind }) {
  const recorder = useMediaRecorder(kind);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoPreviewRef.current;
    if (el && recorder.stream && kind === "video") {
      el.srcObject = recorder.stream;
      void el.play().catch(() => undefined);
    }
  }, [recorder.stream, kind]);

  const isLive = recorder.state === "recording" || recorder.state === "paused";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="font-heading text-base font-bold">
            {kind === "audio" ? "Gravação de áudio" : "Gravação de vídeo"}
          </p>
          {isLive && (
            <Badge className="gap-1.5 bg-destructive text-white" data-testid="recording-indicator">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              {recorder.state === "paused" ? "Pausado" : "Gravando"}
            </Badge>
          )}
        </div>

        {/* preview surface */}
        {kind === "video" ? (
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            {recorder.state === "review" && recorder.previewUrl ? (
              <video src={recorder.previewUrl} controls className="h-full w-full" data-testid="recorder-review-video" />
            ) : (
              <video ref={videoPreviewRef} muted playsInline className="h-full w-full object-cover" data-testid="recorder-camera-preview" />
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-xl bg-[#EDF2E8] dark:bg-[#1B261D]">
            {recorder.state === "review" && recorder.previewUrl ? (
              <audio src={recorder.previewUrl} controls className="w-full px-4" data-testid="recorder-review-audio" />
            ) : (
              <div className="flex items-end gap-1" aria-hidden>
                {Array.from({ length: 24 }, (_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 rounded-full bg-primary/70 ${recorder.state === "recording" ? "animate-pulse" : ""}`}
                    style={{
                      height: recorder.state === "recording" ? `${12 + ((i * 7) % 40)}px` : "10px",
                      animationDelay: `${i * 40}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-center font-heading text-3xl font-bold tabular-nums" data-testid="recorder-timer">
          {formatDuration(recorder.seconds)}
        </p>

        {recorder.state === "error" && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" data-testid="recorder-error">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm">{recorder.error}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(recorder.state === "idle" || recorder.state === "error") && (
            <Button onClick={() => void recorder.start()} data-testid="recorder-start-button" className="gap-2">
              <Mic className="h-4 w-4" />
              {kind === "audio" ? "Iniciar gravação" : "Permitir câmera e gravar"}
            </Button>
          )}
          {recorder.state === "requesting" && (
            <Button disabled className="gap-2">
              Solicitando permissão…
            </Button>
          )}
          {recorder.state === "ready" && (
            <Button onClick={() => void recorder.start()} data-testid="recorder-start-button" className="gap-2">
              <Play className="h-4 w-4" /> Começar a gravar
            </Button>
          )}
          {recorder.state === "recording" && (
            <>
              <Button variant="outline" onClick={recorder.pause} data-testid="recorder-pause-button" className="gap-2">
                <Pause className="h-4 w-4" /> Pausar
              </Button>
              <Button variant="destructive" onClick={recorder.stop} data-testid="recorder-stop-button" className="gap-2">
                <CircleStop className="h-4 w-4" /> Finalizar
              </Button>
            </>
          )}
          {recorder.state === "paused" && (
            <>
              <Button onClick={recorder.resume} data-testid="recorder-resume-button" className="gap-2">
                <Play className="h-4 w-4" /> Continuar
              </Button>
              <Button variant="destructive" onClick={recorder.stop} data-testid="recorder-stop-button" className="gap-2">
                <CircleStop className="h-4 w-4" /> Finalizar
              </Button>
            </>
          )}
          {recorder.state === "review" && (
            <Button variant="outline" onClick={recorder.reset} data-testid="recorder-discard-button" className="gap-2">
              <RotateCcw className="h-4 w-4" /> Descartar e refazer
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {kind === "audio"
            ? "O navegador solicitará acesso ao microfone. Nada é enviado antes de você publicar."
            : "O navegador solicitará acesso à câmera e ao microfone. Nada é enviado antes de você publicar."}
        </p>
      </div>

      <PublishForm
        kind={kind}
        blob={recorder.state === "review" ? recorder.blob : null}
        durationSec={recorder.seconds}
        onPublished={recorder.reset}
      />
    </div>
  );
}

function UploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [duration, setDuration] = useState(0);

  const MAX_MB = 60;
  const accept = "audio/*,video/*";

  const handleFile = (selected: File | null) => {
    if (!selected) {
      setFile(null);
      setPreviewUrl("");
      return;
    }
    const isMedia = selected.type.startsWith("audio/") || selected.type.startsWith("video/");
    if (!isMedia) {
      toast.error("Formato não suportado. Envie um arquivo de áudio ou vídeo.");
      return;
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. O limite é ${MAX_MB} MB.`);
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const isVideo = file?.type.startsWith("video/");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <p className="font-heading text-base font-bold">Enviar arquivo gravado</p>

        <label
          htmlFor="studio-file-input"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center transition-colors hover:bg-muted"
        >
          <Upload className="h-7 w-7 text-muted-foreground" />
          <span className="text-sm font-medium">Clique para escolher um arquivo</span>
          <span className="text-xs text-muted-foreground">Áudio ou vídeo · até {MAX_MB} MB</span>
        </label>
        <input
          id="studio-file-input"
          type="file"
          accept={accept}
          hidden
          data-testid="studio-file-input"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />

        {file && (
          <div className="space-y-3 rounded-xl border border-border p-3" data-testid="studio-file-preview">
            <div className="flex items-center gap-2 text-sm">
              {isVideo ? <Video className="h-4 w-4 text-primary" /> : <FileAudio className="h-4 w-4 text-primary" />}
              <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleFile(null)}
                aria-label="Remover arquivo"
                data-testid="studio-file-remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {isVideo ? (
              <video
                src={previewUrl}
                controls
                className="w-full rounded-lg bg-black"
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              />
            ) : (
              <audio
                src={previewUrl}
                controls
                className="w-full"
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              />
            )}
          </div>
        )}
      </div>

      <PublishForm
        kind={isVideo ? "video" : "audio"}
        blob={file}
        durationSec={duration}
        fileName={file?.name}
        onPublished={() => handleFile(null)}
      />
    </div>
  );
}

function PublishForm({
  kind,
  blob,
  durationSec,
  fileName,
  onPublished,
}: {
  kind: RecorderKind;
  blob: Blob | null;
  durationSec: number;
  fileName?: string;
  onPublished: () => void;
}) {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [publishKind, setPublishKind] = useState<PublishKind>(kind === "video" ? "videocast" : "podcast");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [programId, setProgramId] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);

  const programs = useQuery({
    queryKey: ["programs"],
    queryFn: () => apiGet<ProgramOut[]>("/programs"),
    enabled: !!me,
    retry: false,
  });

  const myPrograms = (programs.data ?? []).filter((p) => p.host_id === me?.id);

  const publish = async (status: "published" | "draft") => {
    if (!me) {
      toast("Entre para publicar conteúdos.", { action: { label: "Entrar", onClick: () => navigate("/login") } });
      return;
    }
    if (!blob) {
      toast.error("Grave ou selecione um arquivo antes de publicar.");
      return;
    }
    if (!title.trim()) {
      toast.error("Informe um título para o conteúdo.");
      return;
    }
    setBusy(true);
    setProgress(0);
    try {
      const extension = kind === "video" ? "webm" : "webm";
      const form = new FormData();
      const name = fileName ?? `gravacao-${Date.now()}.${extension}`;
      form.append("file", blob, name);
      const uploaded = await apiUpload<UploadOut>("/uploads", form, setProgress);

      const created = await apiPost<PublicationOut>("/publications", {
        type: publishKind,
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12),
        media_url: uploaded.url,
        media_kind: kind,
        thumbnail_url: "",
        cover_url: "",
        duration_sec: Math.round(durationSec),
        status,
        program_id: publishKind === "podcast" && programId ? programId : null,
      });

      void queryClient.invalidateQueries({ queryKey: ["publications"] });
      void queryClient.invalidateQueries({ queryKey: ["explore"] });
      void queryClient.invalidateQueries({ queryKey: ["library"] });
      void queryClient.invalidateQueries({ queryKey: ["programs"] });

      toast.success(status === "draft" ? "Rascunho salvo na sua biblioteca." : "Conteúdo publicado!");
      setTitle("");
      setDescription("");
      setCategory("");
      setTags("");
      setProgramId("");
      onPublished();

      if (status === "published") {
        if (created.type === "videocast") navigate(`/video/${created.id}`);
        else if (created.type === "podcast") navigate(created.program_id ? `/podcast/${created.program_id}` : "/podcasts");
        else navigate("/relatos");
      }
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const kindOptions: PublishKind[] = kind === "video" ? ["videocast", "relato"] : ["podcast", "relato"];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <p className="font-heading text-base font-bold">Detalhes da publicação</p>

      <div className="space-y-2">
        <Label>Publicar como</Label>
        <Select value={publishKind} onValueChange={(v: string) => setPublishKind(v as PublishKind)}>
          <SelectTrigger data-testid="publish-kind-select" aria-label="Tipo de publicação">
            <SelectValue>{(v: string) => PUBLISH_LABELS[v as PublishKind]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {kindOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {PUBLISH_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {publishKind === "podcast" && (
        <div className="space-y-2">
          <Label>Programa (opcional)</Label>
          <div className="flex gap-2">
            <Select value={programId} onValueChange={(v: string) => setProgramId(v === "none" ? "" : v)}>
              <SelectTrigger data-testid="publish-program-select" aria-label="Programa">
                <SelectValue placeholder="Episódio solto">
                  {(v: string) => myPrograms.find((p) => p.id === v)?.title ?? "Episódio solto"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Episódio solto</SelectItem>
                {myPrograms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setProgramOpen(true)} data-testid="publish-new-program-button">
              Novo
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="publish-title">Título</Label>
        <Input
          id="publish-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Como organizei meu primeiro estágio"
          data-testid="publish-title-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="publish-description">Descrição</Label>
        <Textarea
          id="publish-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Conte do que se trata o conteúdo…"
          rows={4}
          data-testid="publish-description-input"
        />
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <CategorySelect value={category} onChange={setCategory} testid="publish-category-select" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="publish-tags">Tags (separadas por vírgula)</Label>
        <Input
          id="publish-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="estágio, carreira, dicas"
          data-testid="publish-tags-input"
        />
      </div>

      {busy && progress > 0 && (
        <div className="space-y-1" data-testid="upload-progress">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Enviando… {progress}%</p>
        </div>
      )}

      {!blob && (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {kind === "video"
            ? "Grave um vídeo ou selecione um arquivo para habilitar a publicação."
            : "Grave um áudio ou selecione um arquivo para habilitar a publicação."}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void publish("published")} disabled={!blob || busy} data-testid="publish-button">
          {busy ? "Enviando…" : "Publicar"}
        </Button>
        <Button variant="outline" onClick={() => void publish("draft")} disabled={!blob || busy} data-testid="save-draft-button">
          Salvar rascunho
        </Button>
      </div>

      <ProgramFormDialog open={programOpen} onOpenChange={setProgramOpen} />
    </div>
  );
}

// Text-only relato: no recording, no upload — publishes straight to Vozes da Administração.
function TextRelatoPanel() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const publish = async (status: "published" | "draft") => {
    if (!me) {
      toast("Entre para publicar relatos.", { action: { label: "Entrar", onClick: () => navigate("/login") } });
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error("Informe um título e o texto do relato.");
      return;
    }
    setBusy(true);
    try {
      await apiPost<PublicationOut>("/publications", {
        type: "relato",
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12),
        media_kind: "text",
        status,
      });
      void queryClient.invalidateQueries({ queryKey: ["publications"] });
      void queryClient.invalidateQueries({ queryKey: ["explore"] });
      toast.success(status === "draft" ? "Rascunho salvo." : "Relato publicado!");
      setTitle("");
      setDescription("");
      setCategory("");
      setTags("");
      if (status === "published") navigate("/relatos");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5">
      <div>
        <p className="font-heading text-base font-bold">Escrever um relato</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Compartilhe uma experiência de estágio, entrevista, graduação, liderança ou empreendedorismo.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relato-title">Título</Label>
        <Input
          id="relato-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: O que aprendi na minha primeira entrevista"
          data-testid="relato-title-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="relato-text">Seu relato</Label>
        <Textarea
          id="relato-text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Conte sua história com detalhes — o que aconteceu, o que aprendeu e que conselho deixaria."
          rows={10}
          data-testid="relato-text-input"
        />
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <CategorySelect value={category} onChange={setCategory} testid="relato-category-select" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="relato-tags">Tags (separadas por vírgula)</Label>
        <Input
          id="relato-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="estágio, superação, dicas"
          data-testid="relato-tags-input"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void publish("published")} disabled={busy} data-testid="relato-publish-button">
          {busy ? "Publicando…" : "Publicar relato"}
        </Button>
        <Button variant="outline" onClick={() => void publish("draft")} disabled={busy} data-testid="relato-draft-button">
          Salvar rascunho
        </Button>
      </div>
    </div>
  );
}
