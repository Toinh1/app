import type { ContentType } from "./types";

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  videocast: "Videocast",
  podcast: "Podcast",
  relato: "Relato",
  debate: "Debate",
};

// Mirrors the 12 categories seeded in backend/seed.py (fallback if /api/categories is unreachable).
export const FALLBACK_CATEGORIES = [
  "Gestão de Pessoas",
  "Marketing",
  "Finanças",
  "Empreendedorismo",
  "Logística",
  "Gestão de Projetos",
  "Liderança",
  "Estratégia Empresarial",
  "Recursos Humanos",
  "Carreira e Estágio",
  "Administração Pública",
  "Inovação e Tecnologia",
];

export const REPORT_REASONS = [
  "Conteúdo ofensivo",
  "Assédio",
  "Spam",
  "Violação de direitos autorais",
  "Desinformação",
  "Outro",
];

// Where a publication opens, given its type (used by cards, notifications, search).
export function contentPath(pub: { id: string; type: ContentType; program_id: string | null }): string {
  switch (pub.type) {
    case "videocast":
      return `/video/${pub.id}`;
    case "podcast":
      return pub.program_id ? `/podcast/${pub.program_id}` : "/podcasts";
    case "relato":
      return "/relatos";
    case "debate":
      return "/debates";
  }
}
