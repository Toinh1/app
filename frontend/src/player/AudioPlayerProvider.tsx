// Persistent audio player: one <audio> element + context mounted above the router,
// so a podcast keeps playing while the user navigates anywhere in the app.
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AudioWaveform,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { apiPost } from "@/lib/api";
import { useMe } from "@/lib/session";
import { formatDuration, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PublicationOut } from "@/lib/types";

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

interface AudioPlayerContextValue {
  current: PublicationOut | null;
  playing: boolean;
  position: number;
  duration: number;
  speed: number;
  playPublication: (pub: PublicationOut, fromSec?: number) => void;
  togglePlay: () => void;
  seekTo: (sec: number) => void;
  skipBy: (delta: number) => void;
  changeSpeed: (speed: number) => void;
  changeVolume: (volume: number) => void;
  closePlayer: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function useAudioPlayer(): AudioPlayerContextValue {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useAudioPlayer deve ser usado dentro de AudioPlayerProvider");
  return ctx;
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeRef = useRef<number | null>(null);
  const lastSaveRef = useRef(0);
  const [current, setCurrent] = useState<PublicationOut | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [volume, setVolumeState] = useState(1);

  const saveProgress = useMutation({
    mutationFn: (vars: { publicationId: string; position: number }) =>
      apiPost(
        `/history?publication_id=${encodeURIComponent(vars.publicationId)}&position_sec=${Math.floor(vars.position)}`,
      ),
  });

  const persist = useCallback(
    (publicationId: string, pos: number) => {
      if (!me) return; // history requires a session
      saveProgress.mutate({ publicationId, position: pos });
    },
    [me, saveProgress],
  );

  const safePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    void audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, []);

  const playPublication = useCallback(
    (pub: PublicationOut, fromSec?: number) => {
      const audio = audioRef.current;
      if (!audio || !pub.media_url) return;
      if (current?.id === pub.id && fromSec === undefined) {
        togglePlayCurrent(audio);
        return;
      }
      if (current?.id !== pub.id) {
        audio.src = pub.media_url;
        audio.playbackRate = speed;
        audio.volume = volume;
        setPosition(0);
        setDuration(pub.duration_sec);
        setCurrent(pub);
        lastSaveRef.current = Date.now();
        persist(pub.id, fromSec ?? 0);
      }
      resumeRef.current = fromSec ?? null;
      safePlay();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, speed, volume, safePlay, persist],
  );

  const togglePlayCurrent = (audio: HTMLAudioElement) => {
    if (audio.paused) {
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
      if (current) persist(current.id, audio.currentTime);
    }
  };

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (audio && current) togglePlayCurrent(audio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const seekTo = useCallback((sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(sec, audio.duration || sec));
    setPosition(audio.currentTime);
  }, []);

  const skipBy = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      seekTo(audio.currentTime + delta);
    },
    [seekTo],
  );

  const changeSpeed = useCallback((value: number) => {
    const audio = audioRef.current;
    setSpeedState(value);
    if (audio) audio.playbackRate = value;
  }, []);

  const changeVolume = useCallback((value: number) => {
    const audio = audioRef.current;
    setVolumeState(value);
    if (audio) {
      audio.volume = value;
      audio.muted = value === 0;
    }
  }, []);

  const closePlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    setCurrent(null);
    setPlaying(false);
    setPosition(0);
    setDuration(0);
  }, []);

  const value: AudioPlayerContextValue = {
    current,
    playing,
    position,
    duration,
    speed,
    playPublication,
    togglePlay,
    seekTo,
    skipBy,
    changeSpeed,
    changeVolume,
    closePlayer,
  };

  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}

      <audio
        ref={audioRef}
        hidden
        preload="metadata"
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (!audio || !current) return;
          setPosition(audio.currentTime);
          const now = Date.now();
          if (now - lastSaveRef.current > 10000) {
            lastSaveRef.current = now;
            persist(current.id, audio.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (!audio) return;
          setDuration(audio.duration > 0 ? audio.duration : (current?.duration_sec ?? 0));
          if (resumeRef.current != null) {
            audio.currentTime = resumeRef.current;
            resumeRef.current = null;
          }
        }}
        onEnded={() => {
          setPlaying(false);
          if (current) persist(current.id, 0);
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      {current && (
        <div
          data-testid="audio-dock"
          className="fixed inset-x-0 bottom-16 z-40 md:bottom-0 md:left-64 backdrop-blur-2xl bg-[#263A29]/95 text-white border-t border-[#556B2F]/40 shadow-2xl"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 md:gap-4 md:px-6">
            {current.cover_url || current.thumbnail_url ? (
              <img
                src={current.cover_url || current.thumbnail_url}
                alt=""
                className="h-11 w-11 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#DCE5D0]/15">
                <AudioWaveform className="h-5 w-5 text-[#DCE5D0]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p data-testid="audio-dock-title" className="truncate text-sm font-semibold">
                {current.title}
              </p>
              <p className="truncate text-xs text-[#DCE5D0]/80">
                {current.author_name || initials(current.author_name)} ·{" "}
                {current.program_title || "Áudio"}
              </p>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                data-testid="audio-dock-skip-back"
                aria-label="Retroceder 10 segundos"
                onClick={() => skipBy(-10)}
                className="rounded-full p-2 hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                data-testid="audio-dock-play-pause"
                aria-label={playing ? "Pausar" : "Reproduzir"}
                onClick={togglePlay}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCE5D0] text-[#263A29] hover:bg-white"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
              <button
                data-testid="audio-dock-skip-forward"
                aria-label="Avançar 10 segundos"
                onClick={() => skipBy(10)}
                className="rounded-full p-2 hover:bg-white/10"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>

            <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[#DCE5D0]/80">
                {formatDuration(position)}
              </span>
              <div
                role="slider"
                aria-label="Progresso do áudio"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(position)}
                data-testid="audio-dock-progress-bar"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  seekTo(ratio * duration);
                }}
                className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/15"
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[#DCE5D0]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-xs tabular-nums text-[#DCE5D0]/80">
                {formatDuration(duration)}
              </span>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <button
                aria-label="Silenciar"
                data-testid="audio-dock-mute"
                onClick={() => changeVolume(volume === 0 ? 1 : 0)}
                className="rounded-full p-2 hover:bg-white/10"
              >
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                aria-label="Volume"
                data-testid="audio-dock-volume"
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="w-20 accent-[#DCE5D0]"
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      data-testid="audio-dock-speed"
                      aria-label="Velocidade de reprodução"
                      className="rounded-full border border-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/10"
                    >
                      {speed.toString().replace(".", ",")}x
                    </button>
                  }
                />
                <DropdownMenuContent align="end">
                  {SPEEDS.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={cn(s === speed && "font-bold text-primary")}
                    >
                      {s.toString().replace(".", ",")}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <button
              data-testid="audio-dock-close"
              aria-label="Fechar player"
              onClick={closePlayer}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </AudioPlayerContext.Provider>
  );
}
