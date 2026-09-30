# Pralay — Agent & Build Guide

https://hono.dev/llms.txt
https://ai-sdk.dev/llms.txt
https://docs.langchain.com/llms.txt

> Multi-workspace AI creative platform. **Conversational Create + asset references first**, video later.
> Last updated: 2026-09-30

This file is the source of truth for humans and coding agents working on Pralay.

---

## Product slice we are building now

**Create (per project)** is a chat-first flow, not a separate Image Studio.

Example user prompt:

```text
Create youtube thumbnail where Jonathan lifting trophy with his team and jelly is smiling a lot
@jonathan @teamapexgaming @bmsd @jelly
```

**Expected behavior:**

1. User types in the project Create composer; **`@` at the caret** opens **asset suggestions** (name/slug/tags) from workspace + project library.
2. Picking a suggestion inserts **`@asset_name `**, closes the suggestion menu, moves the caret **after that token (including the trailing space)**, and stages the asset id in Zustand (no composer file attachments).
3. **Uploads** happen only via **Library / Project Assets / Create folder button** → shared **`WorkspaceAssetsUploadDialog`**; after upload, reference assets with **`@`** in the prompt.
4. On send, API receives **prompt text + `referenceAssetIds`** (from staged `@` tokens still present in the prompt).
5. OpenAI chat + tools (today in API; LangGraph growth path) → **`start_generation`** → Inngest + **Grok Imagine** → persist generation + messages in Postgres.
6. UI shows **generation cards** in-thread (queued → processing → done) and outputs in project assets.

**UI rule:** No em dashes in user-facing copy.

---

## AI stack (current decisions)

| Role                      | Provider                                                    | Notes                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Orchestration**         | [LangGraph.js](https://langchain-ai.github.io/langgraphjs/) | Default for chat + tools + future multi-step flows; Postgres checkpointer in prod                                                                                                |
| **Chat / tools (Create)** | OpenAI **`gpt-5.4-mini`**                                   | Default Create chat + LangGraph tool loops ([OpenAI models](https://developers.openai.com/api/docs/models))                                                                      |
| **Thread titles only**    | OpenAI **`gpt-5-nano`**                                     | One short call per new thread; cheapest ([gpt-5-nano](https://developers.openai.com/api/docs/models/gpt-5-nano))                                                                 |
| **Image generation (v1)** | xAI **Grok Imagine**                                        | Cheapest suitable model per [pricing](https://docs.x.ai/developers/pricing.md) + [models](https://docs.x.ai/developers/models.md) at integration time                            |
| **Create UI**             | [Assistant UI](https://www.assistant-ui.com/)               | Chat thread + custom composer (`@` mentions, no inline upload tiles); `useExternalStoreRuntime` + assistant stream API |
| **Create client state**   | **Zustand**                                                 | In-memory draft, **`stagedAssets`** (`@` refs), active thread per **`projectId`**; threads/messages from API            |

**Chat model decision (v1):** Use **`gpt-5.4-mini`** for streamed Create replies and LangGraph tool loops. Use **`gpt-5-nano`** only for auto thread titles. Grok stays on **Imagine** for images only.

**Create UI decision:** Use **Assistant UI** (not AI Elements). Local registry components under `global/components/assistant-ui/`. **Do not** attach files in the Create composer; use **`WorkspaceAssetsUploadDialog`** + **`@`** only. Mention picker is caret-aware (`create-composer-asset-mentions.tsx`).

**Create state:** **Zustand** (`create-project-store`) for composer draft, **`stagedAssets`**, and active thread id per **`projectId`**. **Postgres** is source of truth for threads, messages, generations. No Create data in `localStorage`.

**LangGraph persistence:** [`@langchain/langgraph-checkpoint-postgres`](https://langchain-ai.github.io/langgraphjs/reference/modules/langgraph-checkpoint-postgres.html) + [`checkpointers` guide](https://docs.langchain.com/oss/javascript/langgraph/checkpointers). Call `setup()` once per deploy. Product threads/messages live in **our** Drizzle tables; graph `thread_id` maps to `assistant_threads.id`.

---

## Reference links

### xAI / Grok

| Topic                       | URL                                                                      |
| --------------------------- | ------------------------------------------------------------------------ |
| Overview                    | https://docs.x.ai/overview                                               |
| Full doc index (`llms.txt`) | https://docs.x.ai/llms.txt                                               |
| Quickstart                  | https://docs.x.ai/developers/quickstart.md                               |
| Models                      | https://docs.x.ai/developers/models.md                                   |
| Pricing                     | https://docs.x.ai/developers/pricing.md                                  |
| Responses API (chat, tools) | https://docs.x.ai/developers/model-capabilities/text/generate-text.md    |
| Streaming                   | https://docs.x.ai/developers/model-capabilities/text/streaming.md        |
| Function calling            | https://docs.x.ai/developers/tools/function-calling.md                   |
| Tools overview              | https://docs.x.ai/developers/tools/overview.md                           |
| Imagine (images)            | https://docs.x.ai/developers/model-capabilities/images/generation.md     |
| Image editing / multi-ref   | https://docs.x.ai/developers/model-capabilities/images/editing.md        |
| Files & chat with files     | https://docs.x.ai/developers/model-capabilities/files/chat-with-files.md |
| OpenAPI                     | https://docs.x.ai/openapi.json                                           |
| API base                    | `https://api.x.ai/v1`                                                    |

### LangChain / LangGraph (JavaScript)

| Topic                 | URL                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| LangGraph.js          | https://langchain-ai.github.io/langgraphjs/                                                     |
| LangChain JS          | https://js.langchain.com/                                                                       |
| Checkpointers         | https://docs.langchain.com/oss/javascript/langgraph/checkpointers                               |
| Postgres checkpointer | https://langchain-ai.github.io/langgraphjs/reference/modules/langgraph-checkpoint-postgres.html |
| Prebuilt agents       | https://langchain-ai.github.io/langgraphjs/reference/modules/langgraph_prebuilt.html            |

### Assistant UI

| Topic                    | URL                                                                       |
| ------------------------ | ------------------------------------------------------------------------- |
| Site                     | https://www.assistant-ui.com/                                             |
| Doc index (`llms.txt`)   | https://www.assistant-ui.com/llms.txt                                     |
| Attachments + S3 adapter | https://www.assistant-ui.com/docs/integrations/attachments/custom-adapter |
| LangGraph runtime        | https://www.assistant-ui.com/docs/runtimes/langgraph/threads              |
| Attachment UI            | https://www.assistant-ui.com/docs/ui/attachment                           |

### OpenAI (chat model)

| Topic    | URL                                     |
| -------- | --------------------------------------- |
| API docs | https://platform.openai.com/docs        |
| Models   | https://platform.openai.com/docs/models |

---

## Vision

Unified creative workspace: upload assets, reference them in natural language, produce production-ready visuals without picking models manually (Auto router later).

**Core flow:** Login → Workspace → Library/assets → **Project Create (chat + @refs)** → Generations → Assets/export

**Principles:** Workspace-first · Asset-first · Job-based async AI · Provider abstraction in `packages/ai` · LangGraph for orchestration growth

---

## Architecture (V1)

```text
Amplify          → Next.js (apps/web)
API Gateway      → Hono Lambda (apps/api)
Inngest          → AI/media workflows (apps/inngest, or /api/inngest first)
SQS + Lambda     → Email/background (apps/jobs)
EC2 Docker       → PostgreSQL + Redis
S3 + CloudFront  → Media storage & delivery
SES              → Transactional email
```

**Monorepo:** Bun workspaces + Turborepo

```text
apps/web · apps/api · apps/inngest · apps/jobs
packages/db · packages/auth · packages/storage · packages/email · packages/validators · packages/ui
packages/ai (providers) · packages/agents (LangGraph graphs + tools) — planned
```

**Backend:** Hono · Better Auth · Drizzle · REST `/api/v1`

**Orchestration:** LangGraph in API/worker · Inngest = image/media steps · SQS = email, cleanup

---

## Workspace vs project

| Concept       | Scope                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Workspace** | Org: library, members, settings                                                                                  |
| **Project**   | Creative work: Create threads, generations, project assets                                                       |
| **Assets**    | Workspace-universal (`primaryProjectId` null) + project-specific; Create `@` search spans both per product rules |

---

## Status legend

| Symbol | Meaning                  |
| ------ | ------------------------ |
| ✅     | Done — usable end-to-end |
| 🟡     | Partial                  |
| ⬜     | Not started              |

---

## Phase 0 — Foundation

| Item                     | Status | Notes                          |
| ------------------------ | ------ | ------------------------------ |
| Bun monorepo + Turborepo | ✅     |                                |
| Next.js (`apps/web`)     | ✅     |                                |
| Hono API (`apps/api`)    | ✅     | Lambda-ready                   |
| PostgreSQL + Redis       | ✅     | `infra/ec2/docker-compose.yml` |
| Drizzle + migrations     | ✅     |                                |
| Better Auth              | ✅     |                                |
| Shared packages          | ✅     |                                |
| OpenAPI `/docs`          | ✅     |                                |

---

## Phase 1 — Workspace platform

| Item                             | Status | Notes                                       |
| -------------------------------- | ------ | ------------------------------------------- |
| Workspaces, members, invites     | ✅     |                                             |
| Projects CRUD                    | ✅     |                                             |
| Asset library + scoped list API  | ✅     | `scope=workspace\|project`                  |
| S3 presigned uploads, media URLs | ✅     |                                             |
| Trash                            | ✅     |                                             |
| Project nav + assets page        | ✅     |                                             |
| **Create UI (conversational)**   | 🟡     | Assistant UI + threads + stream; `@` mentions; upload dialog shared with Assets/Library |
| `@` asset suggest API            | ✅     | `GET .../assets/suggest`                    |
| Collections UI                   | 🟡     | DB only                                     |

---

## Phase 2 — AI foundation (current focus)

| Item                                                    | Status | Notes                                                              |
| ------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `assistant_threads` / `assistant_messages`              | ✅     | Create threads + messages API                                      |
| Assistant stream (NDJSON)                               | 🟡     | OpenAI tools + keepalive pings; harden Inngest/generations         |
| `packages/agents` LangGraph + tools                     | 🟡     | Tooling in API via `@repo/agents`; full LangGraph checkpointer TBD |
| OpenAI `gpt-5.4-mini` chat stream + `gpt-5-nano` titles | ✅     | Stream route + thread titles                                       |
| `packages/ai` Grok Imagine adapter                      | 🟡     | Inngest worker path                                                |
| Generations API + Inngest                               | 🟡     | Enqueue + status; polish failures/retries                          |
| `@` asset suggest API                                   | ✅     | `GET .../assets/suggest`                                           |
| Assistant UI + Zustand Create store                     | 🟡     | External store runtime; staged `@` refs only                       |
| **`WorkspaceAssetsUploadDialog`**                       | ✅     | Create + Project Assets + Workspace Library                        |
| Env: `XAI_API_KEY`, `OPENAI_API_KEY`, Inngest           | 🟡     | Keys in `.env.example`; `@repo/env` `aiEnv` / getters; Inngest TBD |
| Create message body (`@repo/validators/create`)         | ✅     | `createProjectMessageBodySchema`                                   |
| Postgres LangGraph checkpointer                         | ⬜     | Separate from product message tables                               |
| Brand kit / templates                                   | ⬜     | Deferred                                                           |

---

## Phase 3+ (abbreviated)

| Phase | Focus                                  |
| ----- | -------------------------------------- |
| 3     | Editor, variations, history gallery    |
| 4     | Batch, usage/credits, presets UI       |
| 5     | Production hardening, Terraform, CI/CD |
| 6     | Video pipeline (post-image stability)  |

---

## Key routes

| Route                                                    | Status     |
| -------------------------------------------------------- | ---------- |
| `/dashboard/workspaces/[id]/projects/[projectId]/create` | 🟡     |
| `/dashboard/workspaces/[id]/projects/[projectId]/assets` | ✅     |
| `/dashboard/workspaces/[id]/library`                     | ✅     |
| Generations API                                          | 🟡     |

---

## API surface

| Group                                                | Status |
| ---------------------------------------------------- | ------ |
| Auth, me, workspaces, projects, assets, media, trash | ✅     |
| Assistant threads/messages                           | ✅     |
| Assistant stream                                     | 🟡     |
| Generations                                          | 🟡     |
| Asset search (for `@`)                               | ✅     | `GET .../assets/suggest` |

---

## Env & local dev

```bash
docker compose -f infra/ec2/docker-compose.yml up
bun run dev          # web + api + Inngest dev server (apps/inngest)
bun run db:migrate
```

Inngest Dev Server UI: `http://localhost:8288`. The worker syncs to `http://localhost:3001/api/inngest`. Set `INNGEST_DEV=1` in `.env`. Root `inngest-cli` needs its postinstall (listed in `trustedDependencies` in root `package.json`); if the CLI binary is missing, run `bun pm trust inngest-cli && bun install`.

See `.env.example`. Required for AI slice: `DATABASE_URL`, S3, `OPENAI_API_KEY`, `XAI_API_KEY`, Inngest keys when worker exists.

---

## NPM packages (installed vs planned)

### Installed today (AI-related)

| Where            | Packages                                                                                                           | Role                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| **apps/web**     | `@assistant-ui/react`, `@assistant-ui/react-markdown`, `zustand`, `@tanstack/react-query`, …                       | Create chat + workspace UI              |
| **apps/api**     | `@repo/agents`, `@repo/ai`, `inngest`, OpenAI via agents, …                                                        | Assistant stream, tools, generations    |
| **packages/agents** | Create chat tools, OpenAI web search                                                                            | `start_generation`, asset tools         |
| **packages/ai**  | Grok Imagine client                                                                                                | Inngest image steps                     |

### Create frontend (conventions)

| Item | Location / notes |
| ---- | ---------------- |
| Runtime | `create-project-runtime-provider.tsx` — external store, stream via Next rewrite to API |
| `@` mentions | `create-composer-asset-mentions.tsx`; caret from shared textarea ref in `create-composer-caret-context.tsx` |
| Upload UI | `WorkspaceAssetsUploadDialog` in `features/workspace/components/` |
| Staged refs | `create-project-store` → `stagedAssets`; send via `resolve-create-send-references.ts` |

### Planned — frontend (`apps/web`)

| Item | Purpose |
| ---- | ------- |
| LangGraph runtime adapter | Optional swap from external store when graph is primary |
| Edit/variation turns | Extend send contract, not composer uploads |

### Planned — backend / workers

| Package / app                                            | Purpose                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| `@langchain/langgraph`                                   | Graph orchestration                                             |
| `@langchain/core`                                        | Messages, tools                                                 |
| `@langchain/openai`                                      | `gpt-5.4-mini`, `gpt-5-nano`                                    |
| `@langchain/langgraph-checkpoint-postgres`               | Graph checkpoints                                               |
| `@langchain/google-genai` or xAI client in `packages/ai` | Grok Imagine (v1 images)                                        |
| `inngest`                                                | Async generation worker (`apps/inngest` or Hono route)          |
| **New workspace packages**                               | `@repo/agents` (graphs + tools), `@repo/ai` (provider adapters) |

### Not planned for v1

| Package               | Why skip                                               |
| --------------------- | ------------------------------------------------------ |
| **AI Elements**       | Chose Assistant UI |
| **Composer uploads**  | Library + `@` only; no AttachmentAdapter on Create |
| **Vercel AI Gateway** | Direct OpenAI + xAI keys in `@repo/env` for now        |

---

## Build order (agents)

1. ~~Validators + migrations (threads, messages).~~ Done.
2. ~~Asset suggest for `@`.~~ Done.
3. ~~Assistant UI + Zustand + `@` (no composer uploads).~~ Done.
4. ~~Shared upload dialog + Assets/Library.~~ Done.
5. Harden generations + Inngest + stream reliability.
6. `packages/agents`: LangGraph checkpointer; optional `useLangGraphRuntime`.
7. Edit/variation flows via new turns/tools (not composer scope creep).

---

## Progress summary

| Area                   | Progress |
| ---------------------- | -------- |
| Foundation + workspace | ~90%     |
| Create UX (frontend)   | ~65%     |
| AI backend (Create)    | ~55%     |

**Current focus:** Generations/Inngest reliability, stream hardening, then LangGraph checkpointer.
