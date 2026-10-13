// Real browser recording via MediaRecorder. No simulated success: if permissions are
// denied or the API is missing, the UI says so explicitly.
import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderKind = "audio" | "video";
export type RecorderState = "idle" | "requesting" | "ready" | "recording" | "paused" | "review" | "error";

function pickMimeType(kind: RecorderKind): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates =
    kind === "audio"
      ? ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
      : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useMediaRecorder(kind: RecorderKind) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string>("");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);

  const stopTimer = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const requestPermission = useCallback(async () => {
    setError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError("Seu navegador não oferece suporte à captura de mídia (getUserMedia).");
      return false;
    }
    if (typeof MediaRecorder === "undefined") {
      setState("error");
      setError("Seu navegador não oferece suporte à gravação (MediaRecorder).");
      return false;
    }
    setState("requesting");
    try {
      const constraints: MediaStreamConstraints =
        kind === "audio" ? { audio: true } : { audio: true, video: { width: 1280, height: 720 } };
      const media = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = media;
      setStream(media);
      setState("ready");
      return true;
    } catch (err) {
      const name = (err as DOMException)?.name ?? "";
      setState("error");
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError(
          kind === "audio"
            ? "Permissão de microfone negada. Autorize o acesso nas configurações do navegador e tente novamente."
            : "Permissão de câmera/microfone negada. Autorize o acesso nas configurações do navegador e tente novamente.",
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError(
          kind === "audio"
            ? "Nenhum microfone foi encontrado neste dispositivo."
            : "Nenhuma câmera ou microfone foi encontrado neste dispositivo.",
        );
      } else if (name === "NotReadableError") {
        setError("O dispositivo está em uso por outro aplicativo. Feche-o e tente novamente.");
      } else {
        setError("Não foi possível acessar o dispositivo de captura. Verifique as permissões.");
      }
      return false;
    }
  }, [kind]);

  const start = useCallback(async () => {
    let media = streamRef.current;
    if (!media) {
      const ok = await requestPermission();
      if (!ok) return;
      media = streamRef.current;
    }
    if (!media) return;
    chunksRef.current = [];
    setBlob(null);
    setPreviewUrl("");
    setSeconds(0);
    const mimeType = pickMimeType(kind);
    try {
      const recorder = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || (kind === "audio" ? "audio/webm" : "video/webm");
        const recorded = new Blob(chunksRef.current, { type });
        setBlob(recorded);
        setPreviewUrl(URL.createObjectURL(recorded));
        setState("review");
        stopTimer();
        releaseStream();
      };
      recorder.onerror = () => {
        setState("error");
        setError("A gravação falhou. Tente novamente.");
        stopTimer();
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      setState("recording");
      startTimer();
    } catch {
      setState("error");
      setError("Não foi possível iniciar a gravação neste navegador.");
    }
  }, [kind, requestPermission, releaseStream]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      stopTimer();
      setState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      startTimer();
      setState("recording");
    }
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    recorderRef.current = null;
    chunksRef.current = [];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl("");
    setSeconds(0);
    setError("");
    releaseStream();
    setState("idle");
  }, [previewUrl, releaseStream]);

  return {
    state,
    error,
    seconds,
    blob,
    previewUrl,
    stream,
    requestPermission,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
