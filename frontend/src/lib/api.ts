import { FALLBACK_CATEGORIES } from "./categories";
import type {
  CategoryOut,
  CommentOut,
  ExplorePayload,
  LibraryPayload,
  MessageOut,
  NotificationList,
  ProfileOut,
  PublicationList,
  PublicationOut,
  ProgramOut,
  SearchResults,
  ToggleLikeOut,
  ToggleSaveOut,
  UserOut,
} from "./types";

/**
 * Local-only data layer. It intentionally keeps the old apiGet/apiPost contract so
 * pages do not need a network server. Data is persisted in this browser only.
 */
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`request failed with ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type LocalUser = UserOut & { password: string; suspended: boolean };
type LocalProgram = ProgramOut;
type LocalState = {
  users: LocalUser[];
  publications: PublicationOut[];
  comments: CommentOut[];
  saved: string[];
  liked: string[];
  following: string[];
  playlists: Array<{ id: string; title: string; is_public: boolean; owner_id: string; owner_name: string; items: PublicationOut[]; created_at: string }>;
  categories: CategoryOut[];
  programs?: LocalProgram[];
};

const STATE_KEY = "administrase-cast-local-state";
const SESSION_KEY = "administrase-cast-local-session";
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function user(
  id: string,
  name: string,
  email: string,
  password: string,
  role: string,
  area = "Administração",
): LocalUser {
  return {
    id,
    name,
    email,
    password,
    role,
    suspended: false,
    bio: "",
    institution: "",
    area,
    semester: "",
    avatar_url: "",
    linkedin: "",
    created_at: now(),
  };
}

function publication(
  title: string,
  type: PublicationOut["type"],
  category: string,
  author: LocalUser,
  media_kind: PublicationOut["media_kind"],
  media_url = "",
): PublicationOut {
  return {
    id: id(),
    type,
    title,
    description: "Conteúdo demonstrativo disponível localmente no navegador.",
    category,
    tags: [category],
    author_id: author.id,
    author_name: author.name,
    author_avatar: "",
    media_url,
    media_kind,
    thumbnail_url: "",
    cover_url: "",
    duration_sec: 0,
    views: 0,
    likes_count: 0,
    comments_count: 0,
    status: "published",
    program_id: type === "podcast" ? "program-local" : null,
    program_title: type === "podcast" ? "Carreira em Foco" : "",
    episode_number: type === "podcast" ? 1 : null,
    resolved: false,
    is_demo: true,
    created_at: now(),
    liked_by_me: false,
    saved_by_me: false,
  };
}

function createInitialState(): LocalState {
  const admin = user("admin-local", "Equipe Administre-se", "admin@administrase.com", "Admin@2025", "admin");
  const ana = user("ana-local", "Ana Beatriz Costa", "ana@demo.com", "Demo@2025", "user", "Marketing");
  return {
    users: [admin, ana],
    publications: [],
    comments: [],
    saved: [],
    liked: [],
    following: [],
    playlists: [],
    categories: FALLBACK_CATEGORIES.map((name) => ({ id: id(), name, slug: name.toLowerCase().replaceAll(" ", "-"), publications_count: 0 })),
    programs: [],
  };
}

function state(): LocalState {
  const stored = localStorage.getItem(STATE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as LocalState;
      const cleaned = {
        ...parsed,
        publications: (parsed.publications ?? []).filter((item) => !item.is_demo),
        programs: (parsed.programs ?? []).filter((program) => program.id !== "program-local"),
      };
      persist(cleaned);
      return cleaned;
    } catch {
      localStorage.removeItem(STATE_KEY);
    }
  }
  const initial = createInitialState();
  persist(initial);
  return initial;
}

function persist(value: LocalState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(value));
}

function currentUser(data = state()): LocalUser | null {
  const currentId = localStorage.getItem(SESSION_KEY);
  return data.users.find((item) => item.id === currentId) ?? null;
}

function withUserFlags(item: PublicationOut, data: LocalState): PublicationOut {
  return { ...item, liked_by_me: data.liked.includes(item.id), saved_by_me: data.saved.includes(item.id) };
}

function publicationList(data: LocalState, type?: string): PublicationList {
  const items = data.publications.filter((item) => !type || item.type === type).map((item) => withUserFlags(item, data));
  return { items, total: items.length, has_more: false };
}

function profile(target: LocalUser, data: LocalState): ProfileOut {
  return {
    ...target,
    followers_count: data.following.includes(target.id) ? 1 : 0,
    following_count: 0,
    publications_count: data.publications.filter((item) => item.author_id === target.id).length,
    is_following: data.following.includes(target.id),
    is_me: currentUser(data)?.id === target.id,
  };
}

function response<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

export async function apiGet<T>(path: string): Promise<T> {
  const data = state();
  const url = new URL(path, "http://local");
  const userNow = currentUser(data);

  if (url.pathname === "/auth/me") {
    if (!userNow) throw new ApiError(401, { detail: "Não autenticado." });
    return response(userNow) as Promise<T>;
  }
  if (url.pathname === "/categories") return response(data.categories) as Promise<T>;
  if (url.pathname === "/publications") return response(publicationList(data, url.searchParams.get("type") ?? undefined)) as Promise<T>;
  if (url.pathname.startsWith("/publications/") && !url.pathname.endsWith("/comments") && !url.pathname.endsWith("/related")) {
    const item = data.publications.find((entry) => entry.id === url.pathname.split("/")[2]);
    if (!item) throw new ApiError(404, { detail: "Conteúdo não encontrado." });
    return response(withUserFlags(item, data)) as Promise<T>;
  }
  if (url.pathname.endsWith("/comments")) {
    const publicationId = url.pathname.split("/")[2];
    return response(data.comments.filter((item) => item.publication_id === publicationId)) as Promise<T>;
  }
  if (url.pathname === "/explore") {
    const list = publicationList(data).items;
    const payload: ExplorePayload = { featured: list.slice(0, 2), trending: list.slice(0, 4), recent: list, creators: data.users.map((item) => item), categories: data.categories };
    return response(payload) as Promise<T>;
  }
  if (url.pathname === "/search") {
    const query = (url.searchParams.get("q") ?? "").toLowerCase();
    const publications = publicationList(data).items.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query));
    const result: SearchResults = { publications, creators: data.users.filter((item) => item.name.toLowerCase().includes(query)), categories: data.categories.filter((item) => item.name.toLowerCase().includes(query)) };
    return response(result) as Promise<T>;
  }
  if (url.pathname.startsWith("/programs/")) {
    const programId = url.pathname.split("/")[2];
    const found = (data.programs ?? []).find((item) => item.id === programId);
    if (!found) throw new ApiError(404, { detail: "Programa não encontrado." });
    const detail = {
      ...found,
      episodes: publicationList(data, "podcast").items.filter((item) => item.program_id === found.id),
    };
    return response(detail) as Promise<T>;
  }
  if (url.pathname === "/programs") return response(data.programs ?? []) as Promise<T>;
  if (url.pathname === "/library") {
    const items = publicationList(data).items;
    const payload: LibraryPayload = { saved: items.filter((item) => data.saved.includes(item.id)), liked: items.filter((item) => data.liked.includes(item.id)), playlists: data.playlists, history: [] };
    return response(payload) as Promise<T>;
  }
  if (url.pathname.startsWith("/users/")) {
    const userId = url.pathname.split("/")[2];
    if (url.pathname.endsWith("/publications")) {
      const type = url.searchParams.get("type") ?? undefined;
      const status = url.searchParams.get("status") ?? "published";
      const items = data.publications
        .filter((item) => item.author_id === userId && item.status === status && (!type || item.type === type))
        .map((item) => withUserFlags(item, data));
      return response({ items, total: items.length, has_more: false } satisfies PublicationList) as Promise<T>;
    }
    const target = data.users.find((item) => item.id === userId);
    if (!target) throw new ApiError(404, { detail: "Usuário não encontrado." });
    if (url.pathname.endsWith("/playlists")) return response(data.playlists.filter((item) => item.owner_id === target.id)) as Promise<T>;
    return response(profile(target, data)) as Promise<T>;
  }
  if (url.pathname === "/notifications") return response({ items: [], unread: 0 } satisfies NotificationList) as Promise<T>;
  if (url.pathname === "/admin/overview") return response({ users_count: data.users.length, publications_count: data.publications.length, comments_count: data.comments.length, debates_count: data.publications.filter((item) => item.type === "debate").length, open_reports: 0, total_views: data.publications.reduce((sum, item) => sum + item.views, 0) }) as Promise<T>;
  if (url.pathname === "/admin/users") return response(data.users) as Promise<T>;
  if (url.pathname === "/admin/publications") return response(data.publications) as Promise<T>;
  if (url.pathname === "/admin/reports") return response([]) as Promise<T>;
  return response([]) as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const data = state();
  const input = (body ?? {}) as Record<string, string>;
  if (path === "/auth/login") {
    const found = data.users.find((item) => item.email === input.email?.toLowerCase().trim() && item.password === input.password);
    if (!found) throw new ApiError(401, { detail: "E-mail ou senha incorretos." });
    localStorage.setItem(SESSION_KEY, found.id);
    return response(found) as Promise<T>;
  }
  if (path === "/auth/register") {
    const created = user(id(), input.name, input.email.toLowerCase().trim(), input.password, "user", input.area || "Administração");
    data.users.push({ ...created, institution: input.institution || "" });
    persist(data);
    localStorage.setItem(SESSION_KEY, created.id);
    return response(created) as Promise<T>;
  }
  if (path === "/auth/logout") {
    localStorage.removeItem(SESSION_KEY);
    return response({ message: "Sessão encerrada." } satisfies MessageOut) as Promise<T>;
  }
  if (path.includes("/like")) {
    const publicationId = path.split("/")[2];
    const index = data.liked.indexOf(publicationId);
    if (index >= 0) data.liked.splice(index, 1); else data.liked.push(publicationId);
    persist(data);
    const item = data.publications.find((entry) => entry.id === publicationId);
    return response({ liked: index < 0, likes_count: item?.likes_count ?? 0 } satisfies ToggleLikeOut) as Promise<T>;
  }
  if (path.includes("/save")) {
    const publicationId = path.split("/")[2];
    const index = data.saved.indexOf(publicationId);
    if (index >= 0) data.saved.splice(index, 1); else data.saved.push(publicationId);
    persist(data);
    return response({ saved: index < 0 } satisfies ToggleSaveOut) as Promise<T>;
  }
  if (path === "/publications") {
    const created = { ...publication(input.title, input.type as PublicationOut["type"], input.category || "Administração", userNowOrThrow(data), input.media_kind as PublicationOut["media_kind"] || "text", input.media_url), description: input.description || "", status: "published" as const };
    data.publications.unshift(created);
    persist(data);
    return response(created) as Promise<T>;
  }
  if (path === "/playlists") {
    const owner = userNowOrThrow(data);
    const created = { id: id(), title: input.title, is_public: true, owner_id: owner.id, owner_name: owner.name, items: [], created_at: now() };
    data.playlists.push(created);
    persist(data);
    return response(created) as Promise<T>;
  }
  if (path === "/programs") {
    const owner = userNowOrThrow(data);
    const created: LocalProgram = {
      id: id(),
      title: input.title,
      description: input.description || "",
      cover_url: input.cover_url || "",
      host_id: owner.id,
      host_name: owner.name,
      host_avatar: owner.avatar_url,
      episodes_count: 0,
      followers_count: 0,
      is_following: false,
      created_at: now(),
    };
    data.programs = [...(data.programs ?? []), created];
    persist(data);
    return response(created) as Promise<T>;
  }
  if (path.endsWith("/comments")) {
    const owner = userNowOrThrow(data);
    const created: CommentOut = { id: id(), publication_id: path.split("/")[2], parent_id: null, author_id: owner.id, author_name: owner.name, author_avatar: "", text: input.text, likes_count: 0, created_at: now(), liked_by_me: false };
    data.comments.push(created);
    persist(data);
    return response(created) as Promise<T>;
  }
  if (path.includes("/follow")) {
    const target = path.split("/")[2];
    const index = data.following.indexOf(target);
    if (index >= 0) data.following.splice(index, 1); else data.following.push(target);
    persist(data);
    return response({ following: index < 0, followers_count: 0 }) as Promise<T>;
  }
  if (path === "/uploads") return response({ url: URL.createObjectURL((input.file as unknown as Blob) ?? new Blob()), filename: "local-upload", size: 0, content_type: "application/octet-stream" }) as Promise<T>;
  return response({ message: "Operação concluída localmente." } satisfies MessageOut) as Promise<T>;
}

function userNowOrThrow(data: LocalState): LocalUser {
  const found = currentUser(data);
  if (!found) throw new ApiError(401, { detail: "Entre para usar este recurso." });
  return found;
}

export const apiPut = <T>(path: string, body?: unknown) => apiPost<T>(path, body);
export const apiPatch = <T>(path: string, body?: unknown) => apiPost<T>(path, body);
export const apiDelete = <T>(_path: string) => response({ message: "Excluído localmente." }) as Promise<T>;

export function apiUpload<T>(path: string, formData: FormData, onProgress?: (pct: number) => void): Promise<T> {
  onProgress?.(100);
  return apiPost<T>(path, { file: formData.get("file") });
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body;
    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
  }
  return "Algo deu errado. Tente novamente.";
}
