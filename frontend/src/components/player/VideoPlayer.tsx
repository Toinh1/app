import { useEffect, useRef, useState } from "react";
import {
  Maximize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Subtitles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Custom video player: play/pause, scrub bar, volume, speed, fullscreen, captions toggle.
export function VideoPlayer({
  src,
  poster,
  captionsSrc,
  onProgress,
  startAt,
}: {
  src: string;
  poster?: string;
  captionsSrc?: string;
  onProgress?: (seconds: number) => void;
  startAt?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lastReportRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    for (const track of Array.from(video.textTracks)) {
      track.mode = captionsOn ? "showing" : "hidden";
    }
  }, [captionsOn]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  };

  const seek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(seconds, video.duration || seconds));
    setPosition(video.currentTime);
  };

  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <div
      ref={wrapperRef}
      data-testid="video-player"
      className="overflow-hidden rounded-2xl bg-black"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        data-testid="video-player-element"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={() => {
          const video = videoRef.current;
          if (!video) return;
          setDuration(video.duration || 0);
          if (startAt && startAt > 0 && startAt < (video.duration || Infinity)) {
            video.currentTime = startAt;
          }
        }}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (!video) return;
          setPosition(video.currentTime);
          const now = Date.now();
          if (onProgress && now - lastReportRef.current > 10000) {
            lastReportRef.current = now;
            onProgress(video.currentTime);
          }
        }}
        className="aspect-video w-full bg-black"
      >
        {captionsSrc && <track kind="captions" src={captionsSrc} srcLang="pt" label="Português" default />}
      </video>

      <div className="space-y-2 bg-[#121A13] px-3 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-xs tabular-nums text-white/70">{formatDuration(position)}</span>
          <div
            role="slider"
            aria-label="Progresso do vídeo"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(position)}
            data-testid="video-progress-bar"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek(((e.clientX - rect.left) / rect.width) * duration);
            }}
            className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/20"
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-[#8FA86E]" style={{ width: `${pct}%` }} />
          </div>
          <span className="w-12 shrink-0 text-xs tabular-nums text-white/70">{formatDuration(duration)}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => seek(position - 10)}
            aria-label="Retroceder 10 segundos"
            data-testid="video-skip-back"
            className="text-white hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={togglePlay}
            aria-label={playing ? "Pausar" : "Reproduzir"}
            data-testid="video-play-pause"
            className="text-white hover:bg-white/10"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => seek(position + 10)}
            aria-label="Avançar 10 segundos"
            data-testid="video-skip-forward"
            className="text-white hover:bg-white/10"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              const video = videoRef.current;
              const next = volume === 0 ? 1 : 0;
              setVolume(next);
              if (video) {
                video.volume = next;
                video.muted = next === 0;
              }
            }}
            aria-label="Silenciar"
            data-testid="video-mute"
            className="text-white hover:bg-white/10"
          >
            {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            aria-label="Volume do vídeo"
            data-testid="video-volume"
            onChange={(e) => {
              const next = Number(e.target.value);
              setVolume(next);
              const video = videoRef.current;
              if (video) {
                video.volume = next;
                video.muted = next === 0;
              }
            }}
            className="w-20 accent-[#8FA86E]"
          />

          <div className="ml-auto flex items-center gap-1">
            {captionsSrc && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCaptionsOn(!captionsOn)}
                aria-label="Alternar legendas"
                data-testid="video-captions-toggle"
                className={cn("text-white hover:bg-white/10", captionsOn && "bg-white/15")}
              >
                <Subtitles className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    data-testid="video-speed-button"
                    aria-label="Velocidade de reprodução"
                    className="rounded-md border border-white/20 px-2 py-1 text-xs font-semibold hover:bg-white/10"
                  >
                    {speed.toString().replace(".", ",")}x
                  </button>
                }
              />
              <DropdownMenuContent align="end">
                {SPEEDS.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    data-testid={`video-speed-${s}`}
                    onClick={() => {
                      setSpeed(s);
                      const video = videoRef.current;
                      if (video) video.playbackRate = s;
                    }}
                    className={cn(s === speed && "font-bold text-primary")}
                  >
                    {s.toString().replace(".", ",")}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const wrapper = wrapperRef.current;
                if (!wrapper) return;
                if (document.fullscreenElement) {
                  void document.exitFullscreen();
                } else {
                  void wrapper.requestFullscreen?.().catch(() => undefined);
                }
              }}
              aria-label="Tela cheia"
              data-testid="video-fullscreen"
              className="text-white hover:bg-white/10"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
