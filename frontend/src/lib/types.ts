// Hand-written mirrors of the backend Pydantic models (backend/models/*).
// Nothing infers across the Python boundary — keep this file in sync in the same edit.
export type ContentType = "videocast" | "podcast" | "relato" | "debate";
export type MediaKind = "video" | "audio" | "text" | "image";
export type StatusType = "published" | "draft";

export interface UserOut {
  id: string;
  name: string;
  email: string;
  role: string;
  bio: string;
  institution: string;
  area: string;
  semester: string;
  avatar_url: string;
  linkedin: string;
  created_at: string | null;
}

export interface ProfileMini {
  id: string;
  name: string;
  avatar_url: string;
  institution: string;
  area: string;
}

export interface ProfileOut {
  id: string;
  name: string;
  avatar_url: string;
  bio: string;
  institution: string;
  area: string;
  semester: string;
  linkedin: string;
  role: string;
  created_at: string | null;
  followers_count: number;
  following_count: number;
  publications_count: number;
  is_following: boolean;
  is_me: boolean;
}

export interface PublicationOut {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author_id: string;
  author_name: string;
  author_avatar: string;
  media_url: string;
  media_kind: MediaKind;
  thumbnail_url: string;
  cover_url: string;
  duration_sec: number;
  views: number;
  likes_count: number;
  comments_count: number;
  status: StatusType;
  program_id: string | null;
  program_title: string;
  episode_number: number | null;
  resolved: boolean;
  is_demo: boolean;
  created_at: string | null;
  liked_by_me: boolean;
  saved_by_me: boolean;
}

export interface PublicationList {
  items: PublicationOut[];
  total: number;
  has_more: boolean;
}

export interface ProgramOut {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  host_id: string;
  host_name: string;
  host_avatar: string;
  episodes_count: number;
  followers_count: number;
  is_following: boolean;
  created_at: string | null;
}

export interface ProgramDetail extends ProgramOut {
  episodes: PublicationOut[];
}

export interface PlaylistOut {
  id: string;
  title: string;
  is_public: boolean;
  owner_id: string;
  owner_name: string;
  items: PublicationOut[];
  created_at: string | null;
}

export interface HistoryEntry {
  publication: PublicationOut;
  position_sec: number;
  updated_at: string | null;
}

export interface LibraryPayload {
  saved: PublicationOut[];
  liked: PublicationOut[];
  playlists: PlaylistOut[];
  history: HistoryEntry[];
}

export interface CommentOut {
  id: string;
  publication_id: string;
  parent_id: string | null;
  author_id: string;
  author_name: string;
  author_avatar: string;
  text: string;
  likes_count: number;
  created_at: string | null;
  liked_by_me: boolean;
}

export interface NotificationOut {
  id: string;
  type: string;
  actor_id: string;
  actor_name: string;
  actor_avatar: string;
  publication_id: string | null;
  publication_type: string;
  publication_title: string;
  text: string;
  read: boolean;
  created_at: string | null;
}

export interface NotificationList {
  items: NotificationOut[];
  unread: number;
}

export interface CategoryOut {
  id: string;
  name: string;
  slug: string;
  publications_count: number;
}

export interface SearchResults {
  publications: PublicationOut[];
  creators: ProfileMini[];
  categories: CategoryOut[];
}

export interface ExplorePayload {
  featured: PublicationOut[];
  trending: PublicationOut[];
  recent: PublicationOut[];
  creators: ProfileMini[];
  categories: CategoryOut[];
}

export interface AdminOverview {
  users_count: number;
  publications_count: number;
  comments_count: number;
  debates_count: number;
  open_reports: number;
  total_views: number;
}

export interface AdminUserOut {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string;
  institution: string;
  suspended: boolean;
  publications_count: number;
  created_at: string | null;
}

export interface ReportOut {
  id: string;
  reporter_id: string;
  reporter_name: string;
  target_id: string;
  target_type: string;
  reason: string;
  details: string;
  status: string;
  target_title: string;
  created_at: string | null;
}

export interface ToggleLikeOut {
  liked: boolean;
  likes_count: number;
}

export interface ToggleSaveOut {
  saved: boolean;
}

export interface ToggleFollowOut {
  following: boolean;
  followers_count: number;
}

export interface ViewOut {
  views: number;
}

export interface UploadOut {
  url: string;
  filename: string;
  size: number;
  content_type: string;
}

export interface MessageOut {
  message: string;
}
