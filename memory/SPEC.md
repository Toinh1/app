# ADMINISTRE-SE CAST — especificação viva

Rede social acadêmica de Administração que combina catálogo de vídeos (YouTube), áudio
persistente (Spotify) e feed social (Instagram). Stack: FastAPI + MongoDB + Vite/React 19/TS.

## Identidade
Verde-musgo (#556B2F / #263A29 / #718355 / #DCE5D0), fundo #F7F8F4, texto #202820.
Fontes: Space Grotesk (títulos) + Plus Jakarta Sans (corpo). Modo escuro disponível
(toggle na sidebar e em /configuracoes, via next-themes).

## Modelo de dados (MongoDB, ids uuid4 string)
- `users` — name, email (único), password_hash (pbkdf2), role (user|admin), bio,
  institution, area, semester, avatar_url, linkedin, suspended, created_at
- `publications` — coleção unificada com discriminador `type`:
  `videocast` | `podcast` | `relato` | `debate`. Campos: title, description, category,
  tags[], author_id/name/avatar, media_url, media_kind (video|audio|text|image),
  thumbnail_url, cover_url, duration_sec, views, likes_count, comments_count,
  status (published|draft), program_id, program_title, episode_number, resolved, is_demo
- `programs` — programas de podcast (title, description, cover_url, host_id)
- `comments` — publication_id, parent_id (respostas), author_*, text, likes_count
- `likes` — user_id + target_id + target_type (publication|comment), único
- `follows` — follower_id + target_id + target_type (user|program), único
- `saved` — favoritos (user_id + publication_id)
- `playlists` — owner_id, title, is_public, publication_ids[]
- `history` — user_id + publication_id + position_sec (continuar ouvindo/assistindo)
- `notifications` — user_id, type (follow|like|comment|reply|episode), actor_*, publication_*, read
- `reports` — denúncias (target_id/type, reason, details, status)
- `categories` — 12 áreas da Administração
- `password_resets` — token, expires_at, used

## Autenticação
Cookie httpOnly `asc_session` (JWT HS256, 30 dias) emitido em `/api/auth/register` e
`/api/auth/login`; `/api/auth/me` responde quem sou; `/api/auth/logout` limpa.
Recuperação de senha: `/api/auth/forgot-password` gera token e **retorna o token na
resposta** (sem provedor de e-mail configurado — fluxo DEMO, exibido na tela de login);
`/api/auth/reset-password` troca a senha. Usuários suspensos são bloqueados no login.
Guardas no frontend: `RequireAuth` (/estudio, /biblioteca, /configuracoes) e
`RequireAdmin` (/admin).

## Rotas do frontend
`/` início · `/explorar` · `/videocasts` · `/video/:id` · `/podcasts` · `/podcast/:id` ·
`/relatos` · `/debates` · `/estudio` · `/biblioteca` · `/perfil/:id` · `/configuracoes` ·
`/admin` · `/login` · `/cadastro` · `*` 404.

## Fluxos principais
1. **Feed** (`/`) — abas Para você / Em alta / Recentes / Seguindo, paginação, destaques.
2. **Videocasts** — catálogo com filtro por categoria + player próprio (play/pause,
   progresso, volume, velocidade 0,5–2x, tela cheia, legendas quando houver), relacionados,
   comentários, curtir/salvar/compartilhar/denunciar, registro de view e progresso.
3. **Podcasts** — programas + episódios; o player de áudio é **persistente** (contexto
   `AudioPlayerProvider` acima do router, dock fixo), com velocidade, volume, ±10s,
   "Continue ouvindo" a partir do histórico e seguir programas.
4. **Estúdio** (`/estudio`) — 4 abas: gravar áudio (MediaRecorder real), gravar vídeo
   (câmera + microfone reais), enviar arquivo (upload multipart com progresso, limite 60 MB)
   e escrever relato em texto. Permissões negadas mostram erro explícito — sem simulação.
   Publicar ou salvar como rascunho.
5. **Relatos** ("Vozes da Administração") — texto, áudio ou vídeo, busca, filtros, comentários
   com respostas, denúncia.
6. **Debates** ("Mesa de Ideias") — criar tese, contribuir, responder, curtir, marcar
   como resolvido (autor/admin).
7. **Biblioteca** — favoritos, curtidos, playlists (criar/adicionar/remover/excluir com
   confirmação) e histórico com retomada.
8. **Perfil** (`/perfil/:id`) — abas por tipo + playlists + rascunhos (só o dono), seguir,
   contadores. E-mail nunca é exposto publicamente (`ProfileOut` não tem email).
9. **Admin** (`/admin`) — métricas, fila de denúncias, suspender usuários, remover
   conteúdos, CRUD de categorias, regras da comunidade.

## Armazenamento de mídia
Uploads vão para `backend/uploads/` e são servidos por `GET /api/files/{name}`
(disco local do pod). Para produção, trocar por S3/GCS mantendo o mesmo contrato de URL.

## Dados demonstrativos
`backend/seed.py` (idempotente, apaga e recria) cria 7 usuários, 17 publicações,
2 programas, 10 comentários, curtidas, seguidores e notificações. Todas as publicações
de seed têm `is_demo: true` e aparecem com o selo **Demo** na interface. As mídias demo
apontam para arquivos públicos de exemplo (SoundHelix / gtv-videos-bucket).
