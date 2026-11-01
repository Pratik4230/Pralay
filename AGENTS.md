# Pralay — Agent & Build Guide

https://hono.dev/llms.txt
https://ai-sdk.dev/llms.txt
https://docs.langchain.com/llms.txt

Images.md
pralay-image-studio-spec.md

Do not store login credentials or provider secrets in this file. Use the approved local secret store or environment configuration for test accounts.

> Multi-workspace AI creative platform. **Conversational Create + asset references first**, video later.
> Last updated: 2026-11-01

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

| Role                      | Provider                                                    | Notes                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Orchestration**         | [LangGraph.js](https://langchain-ai.github.io/langgraphjs/) | Default for chat + tools + future multi-step flows; Postgres checkpointer in prod                                                                     |
| **Chat / tools (Create)** | OpenAI **`gpt-5.6-luna`**                                   | Default Create chat + LangGraph tool loops ([GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna))                               |
| **Thread titles only**    | OpenAI **`gpt-5.6-luna`**                                   | One short call per new thread ([GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna))                                            |
| **Image generation (v1)** | xAI **Grok Imagine**                                        | Cheapest suitable model per [pricing](https://docs.x.ai/developers/pricing.md) + [models](https://docs.x.ai/developers/models.md) at integration time |
| **Create UI**             | [Assistant UI](https://www.assistant-ui.com/)               | Chat thread + custom composer (`@` mentions, no inline upload tiles); `useExternalStoreRuntime` + assistant stream API                                |
| **Create client state**   | **Zustand**                                                 | In-memory draft, **`stagedAssets`** (`@` refs), active thread per **`projectId`**; threads/messages from API                                          |

**Chat model decision (v1):** Use **`gpt-5.6-luna`** for streamed Create replies, LangGraph tool loops, web search, and auto thread titles. Grok stays on **Imagine** for images only.

**Create UI decision:** Use **Assistant UI** (not AI Elements). Local registry components under `global/components/assistant-ui/`. **Do not** attach files in the Create composer; use **`WorkspaceAssetsUploadDialog`** + **`@`** only. Mention picker is caret-aware (`create-composer-asset-mentions.tsx`).

**Create state:** **Zustand** (`create-project-store`) for composer draft, **`stagedAssets`**, and active thread id per **`projectId`**. **Postgres** is source of truth for threads, messages, generations. No Create data in `localStorage`.

**LangGraph persistence:** [`@langchain/langgraph-checkpoint-postgres`](https://langchain-ai.github.io/langgraphjs/reference/modules/langgraph-checkpoint-postgres.html) is active. Run `bun run langgraph:setup` once per deploy. Product threads/messages remain in **our** Drizzle tables; graph `thread_id` maps to `assistant_runs.id` (or the user message id for legacy synchronous turns), while `assistant_thread_id` is carried in configurable metadata. LangGraph reserves `checkpoint_ns` for subgraphs. Product thread deletion removes checkpoints for its runs/messages.

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
packages/ai (providers) · packages/agents (LangGraph graphs + tools) — active
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

| Item                             | Status | Notes                                                                                   |
| -------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| Workspaces, members, invites     | ✅     |                                                                                         |
| Projects CRUD                    | ✅     |                                                                                         |
| Asset library + scoped list API  | ✅     | `scope=workspace\|project`                                                              |
| S3 presigned uploads, media URLs | ✅     |                                                                                         |
| Trash                            | ✅     |                                                                                         |
| Project nav + assets page        | ✅     |                                                                                         |
| **Create UI (conversational)**   | 🟡     | Assistant UI + threads + stream; `@` mentions; upload dialog shared with Assets/Library |
| `@` asset suggest API            | ✅     | `GET .../assets/suggest`                                                                |
| Collections UI                   | 🟡     | DB only                                                                                 |

---

## Phase 2 — AI foundation (current focus)

| Item                                            | Status | Notes                                                                                                   |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `assistant_threads` / `assistant_messages`      | ✅     | Create threads + messages API                                                                           |
| Durable assistant runs + streaming              | ✅     | Persisted ordered events, real model deltas, reconnect, cancel, retry                                   |
| `packages/agents` LangGraph + tools             | ✅     | Model and per-tool nodes with Postgres checkpoint resume                                                |
| OpenAI `gpt-5.6-luna` chat stream + titles      | ✅     | Stream route + thread titles                                                                            |
| `packages/ai` Grok Imagine adapter              | 🟡     | Generate/edit adapter is wired; live provider and storage E2E still needs a current production-like run |
| Generations API + Inngest                       | 🟡     | Retry-safe jobs, final failure handling, manual retry, and realtime status delivery; live E2E pending   |
| `@` asset suggest API                           | ✅     | `GET .../assets/suggest`                                                                                |
| Assistant UI + Zustand Create store             | 🟡     | External store runtime; staged `@` refs only                                                            |
| **`WorkspaceAssetsUploadDialog`**               | ✅     | Create + Project Assets + Workspace Library                                                             |
| Env: `XAI_API_KEY`, `OPENAI_API_KEY`, Inngest   | 🟡     | Keys are documented and Inngest is wired; deployment secrets and live connectivity are not verified     |
| Create message body (`@repo/validators/create`) | ✅     | `createProjectMessageBodySchema`                                                                        |
| Postgres LangGraph checkpointer                 | ✅     | Separate tables managed by `PostgresSaver.setup()`                                                      |
| Image revision history + downloads              | ✅     | Immutable lineage rail, compare, reuse older sources, authenticated download                            |
| Generic AI observability + usage accounting     | ✅     | Provider-neutral events and idempotent credits for text, image, tools, and future modalities            |
| AI usage dashboard + budget enforcement         | ✅     | Workspace and project limits, atomic reservations, owner adjustments, durable alerts, and notifications |
| Collections                                     | 🟡     | Tables and default collection exist; CRUD API and product UI are still missing                          |
| Brand kit / presets / templates                 | 🟡     | Database schema exists; API, UI, Create grounding, and lifecycle rules are still missing                |

---

## Repository audit — 2026-11-01

This section distinguishes code that exists from behavior that has been verified. A feature is only ✅ when its main product path is implemented and there is current test or end-to-end evidence. Schema-only work is 🟡 or ⬜, not complete.

### Done now

| Area                   | Evidence in the repository                                                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation             | Bun/Turborepo workspace, Next.js web app, Hono API, Better Auth, Drizzle/Postgres schema and migrations, Redis/Postgres compose file, OpenAPI registration                                                                   |
| Workspace product      | Workspace CRUD, members, invites, settings, projects, covers/avatars, library/project assets, presigned uploads, scoped media access, and trash/restore flows                                                                |
| Create conversation    | Assistant UI external runtime, per-project threads, Zustand draft/staged references, caret-aware `@` picker, persistent messages, cancel/retry, and thread reload                                                            |
| Durable orchestration  | Inngest assistant runs, LangGraph model/tool graph, Postgres checkpoints keyed by assistant run, ordered persisted run events, and authorized realtime delivery with reconnect reconciliation                                |
| Image workflow         | Grok Imagine generation/edit adapter, generation jobs and retry classification, source/reference selection, AI edit, deterministic resize, immutable lineage/history, authenticated downloads, and project asset persistence |
| Usage controls         | Provider-neutral usage events, idempotent credit debits, atomic reservations, project/workspace budgets, owner adjustments, alerts, notifications, and realtime notification delivery                                        |
| Build quality baseline | Root lint and type-check pass; Inter is self-hosted through `@fontsource-variable/inter`; the web production build completes with webpack without a Google Fonts request                                                     |

### Needs improvement before calling the app production-ready

| Priority | Improvement                                    | Current evidence / reason                                                                                                                                                                                                                                                |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | Make the verification baseline reproducible    | `bun run check-types` passes. `bun test --ignore='**/node_modules/**'` currently reports 50 pass and 7 database integration failures because PostgreSQL is unavailable. Docker Desktop was not running, so the integration suite could not be revalidated in this audit. |
| P0       | Run a real provider/storage/browser smoke test | Revalidate login, asset upload, `@` selection, chat/tool execution, generation, realtime status, edit, resize, download, retry, reload, usage debit, and budget rejection with Postgres, S3, OpenAI, xAI, and Inngest configured.                                        |
| P0       | Add CI                                         | No checked-in CI workflow currently enforces install, type-check, lint, unit tests, database integration tests, migration/checkpointer setup, and production build.                                                                                                      |
| P1       | Expand frontend test coverage                  | Current tests cover stream/event utilities but not the actual mention picker, composer send behavior, thread selector, generation cards, editor dialog, responsive layout, accessibility, or reconnect UI. Add component tests and browser E2E.                          |
| P1       | Remove stale documentation                     | The root `README.md` is still the Turborepo starter, and the send-message OpenAPI description still says LangGraph streaming is not wired. Replace both with current setup and API behavior.                                                                             |
| P1       | Harden operations                              | Add deployed health/readiness checks for Postgres, storage, OpenAI, xAI, Inngest signing, and checkpoint setup; add structured logs, trace correlation, alarms, backup/restore procedures, and failure runbooks.                                                         |
| P1       | Review security and abuse controls             | Complete rate limits, upload/content validation, provider timeout limits, secret rotation, audit coverage, authorization regression tests, and media URL/cache policy review before public launch.                                                                       |
| P2       | Polish Create UX                               | Validate mobile layout, keyboard-only `@` selection, empty/error states, optimistic/retry behavior, long threads, multi-tab behavior, generation progress copy, and accessible image history/compare interactions.                                                       |

### Remaining product work

| Priority | Product work                    | Scope                                                                                                                                                                             |
| -------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Collections                     | CRUD API, collection membership, library/project UI, permissions, trash semantics, and using collections in Create context                                                        |
| P1       | Brand kits                      | Workspace brand settings, colors/fonts/tone/assets UI and API, authorization, and injection into Create generation context                                                        |
| P1       | Presets and templates           | System/workspace presets, template CRUD/gallery/apply flows, asset/reference rules, and Create integration                                                                        |
| P1       | Production deployment           | Final AWS/Amplify/API Gateway/Lambda/EC2/S3/CloudFront/SES configuration, migrations, secrets, CI/CD, rollback, backups, and staging environment                                  |
| P2       | Batch generation                | Product contract, API/tool support, fan-out jobs, aggregate progress, cancellation/retry, cost reservation, and results UI; current schema fields alone are not an implementation |
| P2       | Full editor and history gallery | Current dialog supports AI edit and resize. A richer canvas/layout editor and standalone history/gallery experience remain future work if still in scope.                         |
| P3       | Video                           | Provider abstraction, durable workflow, storage/transcoding, metering, and UI after image workflows are production-stable                                                         |

---

## Phase 3+ (abbreviated)

| Phase | Focus                                                                 |
| ----- | --------------------------------------------------------------------- |
| 3     | Collections, brand kits, presets/templates, and Create UX hardening   |
| 4     | Batch generation plus richer editor and standalone history/gallery UX |
| 5     | Production infrastructure, security hardening, CI/CD, and operations  |
| 6     | Video pipeline after image workflows are production-stable            |

---

## Key routes

| Route                                                    | Status |
| -------------------------------------------------------- | ------ |
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
| Assistant runs/events                                | ✅     |
| Generations                                          | 🟡     |
| Asset search (for `@`)                               | ✅     | `GET .../assets/suggest` |

---

## Env & local dev

```bash
docker compose -f infra/ec2/docker-compose.yml up
bun run dev          # web + api + Inngest dev server (apps/inngest)
bun run db:migrate
bun run langgraph:setup # once per deploy; API dev startup also ensures setup
```

Inngest Dev Server UI: `http://localhost:8288`. The worker syncs to `http://localhost:3001/api/inngest`. Set `INNGEST_DEV=1` in `.env`. Root `inngest-cli` needs its postinstall (listed in `trustedDependencies` in root `package.json`); if the CLI binary is missing, run `bun pm trust inngest-cli && bun install`.

See `.env.example`. Required for AI slice: `DATABASE_URL`, S3, `OPENAI_API_KEY`, `XAI_API_KEY`, Inngest keys when worker exists.

---

## NPM packages (installed vs planned)

### Installed today (AI-related)

| Where               | Packages                                                                                     | Role                                 |
| ------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------ |
| **apps/web**        | `@assistant-ui/react`, `@assistant-ui/react-markdown`, `zustand`, `@tanstack/react-query`, … | Create chat + workspace UI           |
| **apps/api**        | `@repo/agents`, `@repo/ai`, `inngest`, OpenAI via agents, …                                  | Assistant stream, tools, generations |
| **packages/agents** | Create chat tools, OpenAI web search                                                         | `start_generation`, asset tools      |
| **packages/ai**     | Grok Imagine client                                                                          | Inngest image steps                  |

### Create frontend (conventions)

| Item         | Location / notes                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Runtime      | `create-project-runtime-provider.tsx` — external store, stream via Next rewrite to API                      |
| `@` mentions | `create-composer-asset-mentions.tsx`; caret from shared textarea ref in `create-composer-caret-context.tsx` |
| Upload UI    | `WorkspaceAssetsUploadDialog` in `features/workspace/components/`                                           |
| Staged refs  | `create-project-store` → `stagedAssets`; send via `resolve-create-send-references.ts`                       |

### Planned — frontend (`apps/web`)

| Item                      | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| LangGraph runtime adapter | Optional swap from external store when graph is primary |
| Edit/resize turns         | Extend send contract, not composer uploads              |

### Installed — backend / workers

| Package / app                              | Purpose                                                         |
| ------------------------------------------ | --------------------------------------------------------------- |
| `@langchain/langgraph`                     | Graph orchestration                                             |
| `@langchain/core`                          | Messages, tools                                                 |
| `@langchain/openai`                        | `gpt-5.6-luna`                                                  |
| `@langchain/langgraph-checkpoint-postgres` | Graph checkpoints                                               |
| xAI client in `packages/ai`                | Grok Imagine image generation and editing                       |
| `inngest`                                  | Assistant, generation, usage, cleanup, and realtime workflows   |
| Workspace packages                         | `@repo/agents` (graphs + tools), `@repo/ai` (provider adapters) |

### Not planned for v1

| Package               | Why skip                                           |
| --------------------- | -------------------------------------------------- |
| **AI Elements**       | Chose Assistant UI                                 |
| **Composer uploads**  | Library + `@` only; no AttachmentAdapter on Create |
| **Vercel AI Gateway** | Direct OpenAI + xAI keys in `@repo/env` for now    |

---

## Build order (agents)

1. ~~Validators + migrations (threads, messages).~~ Done.
2. ~~Asset suggest for `@`.~~ Done.
3. ~~Assistant UI + Zustand + `@` (no composer uploads).~~ Done.
4. ~~Shared upload dialog + Assets/Library.~~ Done.
5. ~~Harden generation retries, Inngest, and assistant stream reliability.~~ Done.
6. ~~`packages/agents`: LangGraph Postgres checkpointer.~~ Done.
7. ~~Edit and resize flows via new turns/tools (not composer scope creep).~~ Done. Uploaded and generated images support AI edits and deterministic resize. Source assets and parent generations are persisted.
8. ~~Image revision history and downloads.~~ Done. The editor exposes immutable lineage, before/after comparison, older revision reuse, and authenticated image downloads.
9. ~~Generic AI observability and usage accounting.~~ Done. `@repo/usage` records provider-neutral operations and retry-safe credit debits across text, image, tools, and future modalities.
10. ~~AI usage dashboard, budget enforcement, alerts, and credit administration.~~ Done. Workspace and project budgets reserve atomically, owner adjustments are audited and idempotent, and durable monitors deliver deduplicated in-app and email alerts.
11. ~~Realtime generation status and notifications.~~ Done. Authorized Inngest Realtime channels replace recurring generation and notification polling, with Postgres reconciliation on connection and reconnect.

---

## AI usage integration contract

Every provider-backed feature must use `@repo/usage`. Do not create a feature-specific usage counter.

1. Record one immutable `ai_usage_events` row per completed provider operation.
2. Use a stable provider request id or durable operation id as `idempotencyKey`.
3. Set a durable operation name such as `text.chat`, `image.generate`, `audio.transcribe`, `voice.synthesize`, or `video.generate`.
4. Set the modality to `text`, `image`, `audio`, `video`, `embedding`, `tool`, or `other`.
5. Store provider/model, latency, trace/request IDs, common token columns, and provider-specific numeric counters in `metrics`.
6. Successful operations may debit credits. Failed operations record diagnostics with zero credits unless the provider confirms billable usage.
7. Non-AI processing such as Sharp resize may be recorded for observability with zero credits.
8. Keep provider currency in `providerCostMicros`; internal product credits are versioned separately by `AI_CREDIT_POLICY_VERSION`.
9. Add or update credit-policy tests whenever a new modality is introduced.

Historical operations predating metering are backfilled for observability with zero retroactive charges.

---

## Progress summary

| Area                               | Progress |
| ---------------------------------- | -------- |
| Foundation + workspace core        | ~85%     |
| Create UX for the current v1 loop  | ~80%     |
| AI backend for the current v1 loop | ~80%     |
| Product expansion                  | ~20%     |
| Production readiness               | ~35%     |

These percentages are directional planning estimates, not test coverage measurements.

**Current focus:** Restore a green local/CI verification baseline, complete a production-like image workflow smoke test, then build collections, brand kits, and presets/templates.
