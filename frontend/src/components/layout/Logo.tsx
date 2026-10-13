import { Link } from "react-router-dom";
import { AudioWaveform } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" data-testid="logo-link" className={cn("flex items-center gap-2", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <AudioWaveform className="h-5 w-5" />
      </span>
      <span className="font-heading text-base font-black tracking-tighter text-[#263A29] dark:text-[#DCE5D0] md:text-lg">
        ADMINISTRE<span className="text-[#718355] dark:text-[#8FA86E]">-SE</span>{" "}
        <span className="ml-0.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold tracking-normal text-primary-foreground md:text-xs">
          CAST
        </span>
      </span>
    </Link>
  );
}
