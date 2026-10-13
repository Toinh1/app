import { Link } from "react-router-dom";
import { Play, Video } from "lucide-react";
import { Avatar } from "@/components/common/states";
import { formatCount, formatDuration, timeAgo } from "@/lib/format";
import type { PublicationOut } from "@/lib/types";

// YouTube-style grid card for the videocast catalogs and related lists.
export function VideoCard({ pub }: { pub: PublicationOut }) {
  return (
    <Link
      to={`/video/${pub.id}`}
      data-testid={`videocard-${pub.id}`}
      className="group rounded-2xl border border-border bg-card p-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[#263A29]">
        {pub.thumbnail_url ? (
          <img
            src={pub.thumbnail_url}
            alt={pub.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#556B2F] to-[#263A29]">
            <Video className="h-8 w-8 text-[#DCE5D0]" />
          </div>
        )}
        {pub.duration_sec > 0 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
            {formatDuration(pub.duration_sec)}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
            <Play className="ml-0.5 h-5 w-5" />
          </span>
        </span>
      </div>
      <div className="mt-3 flex gap-3">
        <Avatar name={pub.author_name} url={pub.author_avatar} className="h-8 w-8 text-xs" />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{pub.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{pub.author_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatCount(pub.views)} visualizações · {timeAgo(pub.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}
