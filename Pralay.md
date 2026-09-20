# Pralay — Product & Build Tracker

> Multi-workspace AI creative platform. **Images first**, video later.
> Last updated: 2026-09-20

---

## Vision

A unified creative workspace where users upload assets, set context, and produce production-ready visuals — without needing to know which AI model to use.

**Core flow:** Login → Workspace → Assets/Brand → Create → Generate/Edit → Project/Library → Export

**Principles:** Workspace-first · Asset-first · Job-based async AI · Provider-agnostic · Cost-first AWS

---

## Target Users

Creators, designers, social-media managers, marketers, agencies, developers — anyone managing brand/campaign visuals across isolated workspaces.

---

## AI Model Selection (decision)

| Mode | Who | Default |
|------|-----|---------|
| **Auto** | Most users | ✅ Yes — model router picks by task, quality, references, cost, plan |
| **Manual** | Advanced users | Optional override in Image Studio |

**V1 rule:** Auto is default. Manual is an advanced toggle, not the primary UX. Router starts with Gemini + OpenAI behind a provider abstraction.

---

## Architecture (V1)

```text
Amplify          → Next.js (apps/web)
API Gateway      → Hono Lambda (apps/api)
Inngest          → AI/media workflows (apps/inngest, or /api/inngest shortcut first)
SQS + Lambda     → Email/background (apps/jobs)
EC2 Docker       → PostgreSQL + Redis
S3 + CloudFront  → Media storage & delivery
SES              → Transactional email
```

**Monorepo:** Bun workspaces + Turborepo

```text
apps/web · apps/api · apps/inngest · apps/jobs
packages/db · packages/auth · packages/storage · packages/email · packages/validators · packages/ui · packages/ai (planned)
```

**Frontend:** Next.js App Router · TanStack Query (server state) · Zustand (editor/client state, planned) · Tailwind · shadcn/ui

**Backend:** Hono · Better Auth · Drizzle · REST `/api/v1`

**Orchestration:** Inngest = AI/media pipelines · SQS = email, cleanup, webhooks

**Not in V1 infra:** ECS/Fargate, ALB, RDS, ElastiCache, NAT Gateway (upgrade paths documented when needed)

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done — usable end-to-end |
| 🟡 | Partial — schema, placeholder, or incomplete |
| ⬜ | Not started |

---

## Phase 0 — Foundation

| Item | Status | Notes |
|------|--------|-------|
| Bun monorepo + Turborepo | ✅ | |
| Next.js app (`apps/web`) | ✅ | Marketing, auth, dashboard |
| Hono API (`apps/api`) | ✅ | Lambda-ready (`lambda.ts`) |
| PostgreSQL + Redis (Docker Compose) | ✅ | `infra/ec2/docker-compose.yml` |
| Drizzle schema + migrations | ✅ | Full product schema (6 migrations) |
| Better Auth (email, OTP, reset) | ✅ | Optional Google/GitHub OAuth |
| Session + route protection | ✅ | `proxy.ts` + API middleware |
| Shared packages (auth, db, storage, email, ui, validators) | ✅ | |
| OpenAPI docs | ✅ | `/docs` |
| Terraform (minimal) | ⬜ | EC2, S3, VPC |
| Amplify + custom domains | ⬜ | `app.pralay.com`, `api.pralay.com` |
| GitHub Actions → ECR → Lambda | ⬜ | |

---

## Phase 1 — Workspace Platform

| Item | Status | Notes |
|------|--------|-------|
| Workspaces CRUD | ✅ | Name, slug, description, avatar, cover |
| Members + roles (owner/admin/member) | ✅ | |
| Invites (create, accept, revoke) | ✅ | |
| Projects CRUD | ✅ | Covers, archive, delete rules |
| Asset library | ✅ | Upload, drag/drop, rename, bulk delete, infinite scroll |
| S3 presigned uploads | ✅ | Avatars, covers, assets |
| Media URL resolution | ✅ | `/api/v1/media` |
| Trash (soft-delete, restore, purge) | ✅ | Workspaces, projects, assets |
| Default workspace on signup | ✅ | + "My Library" collection |
| User profile | ✅ | |
| Collections UI/API | 🟡 | DB + default only; no management UI |
| Notifications | 🟡 | Navbar icon only; no backend |
| Dashboard (generations, jobs, usage) | 🟡 | Workspace list done; AI summary widgets missing |

---

## Phase 2 — Image Foundation

| Item | Status | Notes |
|------|--------|-------|
| Generation DB schema | 🟡 | Tables exist; no API |
| `packages/ai` provider abstraction | ⬜ | `generate()`, `edit()`, `variations()` |
| Gemini integration | ⬜ | |
| OpenAI integration | ⬜ | |
| Model router (Auto + Manual) | ⬜ | Task, quality, refs, cost, plan |
| Presets schema | 🟡 | Social/developer/marketing sizes |
| Presets UI | ⬜ | YouTube thumb, IG post, app icon, etc. |
| Brand kit schema | 🟡 | Logo, colors, typography, style |
| Brand kit UI/API | ⬜ | |
| Asset tags, search, favorites | ⬜ | |
| Asset versioning schema | 🟡 | No UI/API |
| Usage/credits schema | 🟡 | No tracking yet |

---

## Phase 3 — Image Generation (core MVP)

| Item | Status | Notes |
|------|--------|-------|
| Image Studio / Create UI | ⬜ | Sidebar "Create" is placeholder |
| `POST /generations` API | ⬜ | |
| Reference image selection | ⬜ | From workspace assets |
| AI context engine | ⬜ | Prompt + workspace/brand/project context |
| Inngest image workflow | ⬜ | `apps/inngest` or `/api/inngest` |
| Job states (queued → completed) | ⬜ | CREATED/QUEUED/PROCESSING/UPLOADING/COMPLETED/FAILED |
| TanStack Query job polling | ⬜ | SSE later |
| S3 generated outputs | ⬜ | `generated/`, `thumbnails/` |
| Generation gallery / history | ⬜ | |
| SQS + SES job-complete email | ⬜ | |
| Retry + idempotency | ⬜ | Inngest step retries |

---

## Phase 4 — Image Editor

| Item | Status | Notes |
|------|--------|-------|
| Select existing image to edit | ⬜ | |
| NL editing (remove bg, replace, expand, etc.) | ⬜ | |
| Version tree (edit branches) | ⬜ | Non-destructive edits |
| Variations | ⬜ | |
| Smart resize (intelligent recompose) | ⬜ | Not simple stretch |
| Export/download | ⬜ | |

---

## Phase 5 — Creative Features

| Item | Status | Notes |
|------|--------|-------|
| Templates (save/reuse layouts) | ⬜ | Schema exists |
| Batch generation | ⬜ | Fan-out via Inngest |
| Usage/credits tracking | ⬜ | Per provider/model |
| AI context from brand kit | ⬜ | |
| Collections (organize assets) | ⬜ | |
| Search (metadata → semantic later) | ⬜ | Postgres first |

---

## Phase 6 — Production Hardening

| Item | Status | Notes |
|------|--------|-------|
| CloudWatch alarms | ⬜ | |
| SSM Parameter Store secrets | ⬜ | |
| CloudFront for S3 media | ⬜ | |
| Postgres backup Lambda → S3 | ⬜ | |
| VPC endpoints (avoid NAT) | ⬜ | |
| Full Terraform coverage | ⬜ | |
| Evaluate RDS / ElastiCache upgrade | ⬜ | When scale requires |

---

## Phase 7 — Video (post-image stability)

| Item | Status | Notes |
|------|--------|-------|
| Video upload (multipart S3) | ⬜ | |
| Analysis pipeline (Inngest) | ⬜ | Metadata, scenes, transcription |
| Moment detection + user approval | ⬜ | |
| Clip generation (FFmpeg on EC2) | ⬜ | Not Lambda |
| Smart vertical reframe (9:16) | ⬜ | |
| Captions (SRT/VTT/styled) | ⬜ | |
| AI hooks/titles/descriptions | ⬜ | |
| Thumbnail from video frame | ⬜ | Bridges image + video |
| Content repurposing (1 video → many assets) | ⬜ | |

---

## Phase 8 — Assistant & Collaboration (later)

| Item | Status | Notes |
|------|--------|-------|
| AI Creative Assistant (Vercel AI SDK) | ⬜ | Streaming chat UI |
| LangGraph agent workflows | ⬜ | Multi-step only where needed |
| Comments, mentions, approvals | ⬜ | |
| Activity feed | ⬜ | DynamoDB if volume justifies |
| SSE live job updates | ⬜ | Upgrade from polling |
| Semantic/vector search | ⬜ | Only when product needs it |

---

## V1 Scope (first production milestone)

Must ship for V1:

```text
✅ Auth + workspaces + projects + asset library
⬜ Brand kit
⬜ Image generation + editing + versions
⬜ Reference images + presets + smart resize
⬜ Batch generation + generation history
⬜ Inngest + Gemini + OpenAI + model router (Auto default, Manual optional)
⬜ S3 + usage/credits + email notifications
⬜ Amplify + Lambda + EC2 Docker + Terraform + CI/CD
```

**Explicitly not V1:** Video pipeline, AI assistant, advanced collaboration, RDS/ElastiCache/ECS.

---

## Key Routes (planned product surface)

| Route / Module | Phase | Status |
|----------------|-------|--------|
| `/dashboard` | 0–1 | 🟡 List done; AI widgets missing |
| `/dashboard/workspaces/[id]` | 1 | ✅ |
| `/dashboard/workspaces/[id]/projects/[id]` | 1 | ✅ |
| `/create` or Image Studio | 3 | ⬜ |
| `/generated` | 3 | ⬜ |
| `/dashboard/trash` | 1 | ✅ |
| Templates | 5 | ⬜ |
| Video Studio | 7 | ⬜ |

---

## API Surface (tracker)

| Endpoint group | Status |
|----------------|--------|
| Auth (`/api/auth/*`) | ✅ |
| Me (`/api/v1/me`) | ✅ |
| Workspaces, members, invites | ✅ |
| Projects | ✅ |
| Assets | ✅ |
| Media | ✅ |
| Trash | ✅ |
| Generations | ⬜ |
| Templates | ⬜ |
| Brand kits | ⬜ |
| Collections | ⬜ |
| Usage | ⬜ |
| Notifications | ⬜ |

---

## Env & Local Dev

```bash
docker compose -f infra/ec2/docker-compose.yml up   # Postgres + Redis
bun run dev                                          # web + api
bun run db:migrate                                   # Drizzle migrations
```

See `.env.example` for required variables (DB, S3, SES, OAuth, AI keys when added).

---

## Progress Summary

| Phase | Focus | Progress |
|-------|-------|----------|
| 0 | Foundation | ~85% |
| 1 | Workspace platform | ~80% |
| 2 | Image foundation | ~15% |
| 3 | Image generation | 0% |
| 4 | Image editor | 0% |
| 5 | Creative features | 0% |
| 6 | Production hardening | 0% |
| 7 | Video | 0% |
| 8 | Assistant & collaboration | 0% |

**Current focus:** Finish Phase 1 gaps → start Phase 2 (`packages/ai`) → Phase 3 (Image Studio + Inngest generation).

---

## Removed from this doc (intentionally)

Detailed user persona examples, full AWS diagram prose, FFmpeg/MediaConvert deep dives, DynamoDB access patterns, CI/CD step-by-step, and duplicate architecture sections — kept only decisions needed to build and track progress. Restore detail in separate docs if needed (`docs/architecture.md`, `docs/aws.md`).
