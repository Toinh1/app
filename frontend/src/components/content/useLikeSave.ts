// Shared like/save optimistic interactions for publication cards and detail pages.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiErrorMessage, apiPost } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { PublicationOut, ToggleLikeOut, ToggleSaveOut } from "@/lib/types";

export function useLikeSave(pub: PublicationOut) {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(pub.liked_by_me);
  const [likesCount, setLikesCount] = useState(pub.likes_count);
  const [saved, setSaved] = useState(pub.saved_by_me);

  useEffect(() => {
    setLiked(pub.liked_by_me);
    setLikesCount(pub.likes_count);
    setSaved(pub.saved_by_me);
  }, [pub.id, pub.liked_by_me, pub.likes_count, pub.saved_by_me]);

  const requireLogin = (what: string) => {
    toast(what, {
      action: { label: "Entrar", onClick: () => navigate("/login") },
    });
  };

  const toggleLike = () => {
    if (!me) {
      requireLogin("Entre para curtir conteúdos.");
      return;
    }
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    apiPost<ToggleLikeOut>(`/publications/${pub.id}/like`)
      .then((res) => {
        setLiked(res.liked);
        setLikesCount(res.likes_count);
      })
      .catch((error) => {
        setLiked(!nextLiked);
        setLikesCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
        toast.error(apiErrorMessage(error));
      });
  };

  const toggleSave = () => {
    if (!me) {
      requireLogin("Entre para salvar na sua biblioteca.");
      return;
    }
    const nextSaved = !saved;
    setSaved(nextSaved);
    apiPost<ToggleSaveOut>(`/publications/${pub.id}/save`)
      .then((res) => setSaved(res.saved))
      .catch((error) => {
        setSaved(!nextSaved);
        toast.error(apiErrorMessage(error));
      });
  };

  const share = () => {
    const path =
      pub.type === "videocast"
        ? `/video/${pub.id}`
        : pub.type === "podcast"
          ? pub.program_id
            ? `/podcast/${pub.program_id}`
            : "/podcasts"
          : pub.type === "relato"
            ? "/relatos"
            : "/debates";
    const url = `${window.location.origin}${path}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copiado para a área de transferência!"))
      .catch(() => toast.error("Não foi possível copiar o link."));
  };

  return { liked, likesCount, saved, toggleLike, toggleSave, share, me };
}
