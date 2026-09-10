# AI Creative & Content Platform

## 1. Product Vision

We are building a production-grade, multi-workspace AI creative platform for creators, developers, designers, social-media managers, marketers, agencies, and businesses.

The platform is not just an AI image generator. It will become a unified creative workspace where users can:

- Generate images with AI
- Edit existing images with AI
- Create production-ready assets for specific dimensions and formats
- Organize brand/person/product/reference assets into workspaces
- Create reusable templates
- Generate multiple variations and batch creatives
- Upload long-form videos
- Automatically discover important moments
- Generate clips, Shorts/Reels, captions, thumbnails, and other derivative content
- Manage projects and campaigns
- Collaborate with other workspace members
- Search and reuse previous creative assets
- Receive notifications when long-running jobs finish

The first priority is **Images**. The video/content-repurposing system will be built on top of the same asset, job, storage, AI, and workspace foundations.

**V1 architecture (summary):**

```text
Amplify          → Next.js frontend (apps/web)
Lambda + API GW  → Hono API, Inngest, jobs (apps/api, inngest, jobs)
EC2 Docker       → PostgreSQL + Redis
S3               → Media files
Inngest          → AI workflow orchestration
```

---

# 2. Product Positioning

The core idea is:

> Upload your assets, define your creative context, tell the platform what you want, and let the platform produce production-ready visual content.

A user should not need to understand which AI model is best.

The platform will eventually have an AI model router that can choose the appropriate model based on:

- Task
- Image type
- Required quality
- Editing vs generation
- Text requirements
- Reference images
- Resolution
- Cost
- User plan
- Provider availability

Initial AI providers:

- Google Gemini image models
- OpenAI image models

The backend must use a provider abstraction so FLUX, Ideogram, Grok, Recraft, or other providers can be added later without changing the application architecture.

---

# 3. Target Users

## Developers

Use cases:

- App icons
- Favicons
- App Store assets
- Website OG images
- Product illustrations
- Landing-page graphics
- Documentation graphics
- Marketing assets

Example:

> Create a 1024×1024 app icon for a finance application with a modern premium style.

## YouTube Creators

Use cases:

- YouTube thumbnails
- Channel graphics
- Video promotional images
- Shorts
- Reels
- Social posts

Example:

> Create a thumbnail for Jonathan's BMSD 2026 victory using his workspace references.

## Social Media Managers

Use cases:

- Multiple brand workspaces
- Campaign creatives
- Instagram posts
- Stories
- X graphics
- LinkedIn graphics
- Batch generation
- Content repurposing

Example workspaces:

- Jonathan
- CarryMinati
- Technical Guruji

Each workspace maintains its own visual context and assets.

## Graphic Designers

Use cases:

- Concept generation
- Image editing
- Background replacement
- Object removal
- Variations
- Resizing
- Reference-based creation
- Brand asset generation

## Agencies

Use cases:

- Multiple client workspaces
- Team collaboration
- Projects
- Brand kits
- Templates
- Approval workflows
- Asset management

---

# 4. Core Product Concepts

## 4.1 User

A person with an account.

A user can belong to multiple workspaces.

## 4.2 Workspace

A completely isolated creative environment.

Example:

```text
User
├── Jonathan
├── CarryMinati
├── Technical Guruji
├── My Startup
└── Client ABC
```

Each workspace has:

- Members
- Brand profile
- Assets
- Projects
- Templates
- Generated images
- Generated videos
- AI context
- Activity

## 4.3 Project

A project belongs to a workspace.

Examples:

```text
Jonathan
├── BMSD 2026
├── YouTube
├── Instagram Campaign
└── Brand Campaign
```

Projects organize related creative work.

## 4.4 Asset

Any uploaded or generated media.

Examples:

- Person image
- Logo
- Product image
- Background
- Video
- Generated image
- Thumbnail
- Short video

Original binary files are stored in S3.

Metadata is stored in PostgreSQL.

## 4.5 Generation

An AI creation/editing operation.

A generation contains:

- User request
- Workspace
- Input assets
- Prompt/context
- Model
- Provider
- Parameters
- Status
- Output assets
- Cost/credit usage
- Error information

## 4.6 Job

A long-running asynchronous operation.

Examples:

- Image generation
- Image editing
- Batch generation
- Video analysis
- Video processing
- Thumbnail generation

Jobs use two orchestration layers, split by workload type:

**Inngest** — all AI and media-intelligence workflows:

- Image generation and editing
- Batch generation
- Video analysis, transcription, and AI moment detection
- Thumbnail generation and content repurposing
- Multi-step agent workflows (with LangGraph where needed)

**SQS** — non-AI, AWS-native async work:

- Email delivery (workspace invites, job-complete notifications, account alerts)
- Webhook fan-out and lightweight event processing
- Cleanup, maintenance, and other simple background tasks

Inngest owns step retries, durable state, and observability for AI pipelines. SQS owns high-volume, fire-and-forget tasks where a durable workflow engine is unnecessary.

---

# 5. Product Modules

The application will eventually contain:

```text
Dashboard
Workspaces
Create
Image Studio
Video Studio
Assets
Projects
Templates
Generated
Search
AI Assistant
Notifications
Collaboration
Usage
Settings
```

The implementation priority is:

```text
Phase 1
Image Platform

Phase 2
Image Intelligence + Templates

Phase 3
Video Processing

Phase 4
AI Creative Assistant

Phase 5
Collaboration + Advanced Search
```

---

# 6. Phase 1: Image Platform

This is the first and most important release.

## 6.1 Image Dashboard

The dashboard should show:

- Recent generations
- Recent assets
- Active jobs
- Workspace summary
- Quick create actions
- Projects
- Usage/credits
- Notifications

Example:

```text
Good morning

Workspace: Jonathan

[Generate Image]
[Edit Image]
[Create Thumbnail]

Recent
--------------------------------
Generated image
Generated image
Edited image

Active Jobs
--------------------------------
BMSD thumbnail      Processing
Instagram campaign  Completed
```

---

# 7. Image Generation

The primary image workflow:

```text
User
 ↓
Create
 ↓
Generate Image
 ↓
Select Workspace
 ↓
Describe request
 ↓
Select references
 ↓
Select format
 ↓
Select style/quality
 ↓
Select number of variations
 ↓
Generate
 ↓
Job created
 ↓
Inngest
 ↓
AI Worker
 ↓
AI Provider
 ↓
S3
 ↓
Generation completed
 ↓
Gallery
```

Example request:

> Create an image of Jonathan winning BMSD 2026 with his team.

The system uses workspace context and selected assets to improve the generation.

---

# 8. Image Context Engine

A simple prompt should be able to become a rich AI request.

User:

> Create Jonathan winning BMSD 2026.

Context engine:

```text
User request
+
Workspace information
+
Relevant people
+
Relevant assets
+
Brand preferences
+
Project context
+
Generation settings
```

Result:

```text
Structured AI request
```

This structured request is sent to the model router.

The system should not blindly attach every workspace asset to every request.

Relevant assets should be selected using:

- Explicit user selection
- Asset tags
- Asset metadata
- Project context
- Semantic search later
- AI-assisted relevance selection

---

# 9. Reference Images

Users can select one or multiple reference images.

Example:

```text
References

[Jonathan face]
[Jonathan team]
[BMSD logo]
[Stadium]
```

The generation request can specify:

- Subject reference
- Character reference
- Product reference
- Style reference
- Composition reference
- Logo/brand reference

The provider abstraction should support models with different reference-image capabilities.

---

# 10. Image Editing

Users can upload or select an existing image.

Editor features:

- Remove background
- Replace background
- Remove object
- Add object
- Replace object
- Expand image
- Change aspect ratio
- Relight
- Restyle
- Upscale
- Generate variations
- Improve image
- Natural-language editing

Example:

> Remove the people in the background and place Jonathan in a stadium.

Editing should produce a new version instead of destroying the original.

---

# 11. Image Versioning

Every edit creates a version.

```text
Original
   │
   ├── Edit 1
   │      └── Edit 2
   │
   └── Variation 2
```

Users can:

- Preview versions
- Restore a version
- Continue editing
- Compare versions
- Download any version

---

# 12. Smart Resize

Users can transform an image into predefined formats.

Examples:

```text
YouTube Thumbnail     1280 × 720
Instagram Post        1080 × 1080
Instagram Story       1080 × 1920
X Header              1500 × 500
LinkedIn Banner       1584 × 396
App Icon              1024 × 1024
Favicon               512 × 512
Custom                Any supported size
```

The system should intelligently recompose/extend images rather than simply stretch them.

---

# 13. Production Presets

Presets make the platform useful to professionals.

Categories:

## Social

- Instagram Post
- Instagram Story
- X Post
- X Header
- LinkedIn Post
- LinkedIn Banner

## Video

- YouTube Thumbnail
- YouTube Banner
- Shorts Cover

## Developer

- App Icon
- Favicon
- OG Image
- App Store Asset
- Play Store Asset

## Marketing

- Advertisement
- Product Launch
- Promotional Banner
- Campaign Creative

## Custom

Users can specify:

- Width
- Height
- Aspect ratio
- Format
- Quality

---

# 14. Batch Generation

Users can request multiple outputs.

Example:

> Create 20 Instagram creatives for this campaign.

System:

```text
Request
 ↓
20 generation jobs
 ↓
Inngest (fan-out workflow)
 ↓
Workers
 ↓
AI providers
 ↓
20 outputs
```

The UI should show:

```text
20 generations

Completed   12
Processing   5
Queued       2
Failed       1
```

Users can retry failed jobs individually.

---

# 15. Templates

Users can save reusable creative structures.

Example:

```text
YouTube Gaming Thumbnail

[Person]
[Background]
[Main text]
[Logo]
```

Then:

> Generate 10 thumbnails using this template.

Templates can belong to:

- User
- Workspace
- Project

Future versions can support public/community templates.

---

# 16. Brand Kit

Each workspace can have a Brand Kit.

```text
Brand
├── Logo
├── Colors
├── Typography
├── Visual style
├── Image style
├── Tone
└── Reference assets
```

The AI can use this information when generating creative assets.

---

# 17. Asset Library

The asset library is a major part of the product.

```text
Assets
├── People
├── Products
├── Logos
├── Backgrounds
├── Locations
├── References
├── Generated
└── Other
```

Features:

- Upload
- Drag/drop
- Preview
- Rename
- Tag
- Search
- Filter
- Favorite
- Archive
- Delete
- Create collection
- Use in generation

Future AI features:

- Auto-tagging
- Image descriptions
- Subject detection
- Similar image search
- Semantic search
- Duplicate detection

---

# 18. Image Metadata

For every asset we can store:

```text
id
workspaceId
projectId
name
type
mimeType
size
width
height
s3Key
thumbnailKey
tags
description
createdBy
createdAt
updatedAt
```

Optional future metadata:

```text
subjects
faces
colors
embedding
AI description
```

---

# 19. Image Storage Architecture

Binary data should not live in PostgreSQL.

```text
Browser
   ↓
S3
   ├── originals/
   ├── generated/
   ├── thumbnails/
   ├── exports/
   └── temporary/
```

PostgreSQL stores metadata and relationships.

CloudFront delivers frequently accessed media.

---

# 20. Image Generation Architecture

The generation system should be asynchronous.

```text
Browser
   ↓
POST /generations
   ↓
Hono API (Lambda)
   ↓
Create generation record
   ↓
Send Inngest event
   ↓
Return jobId
```

Worker (Inngest function):

```text
Inngest
 ↓
Image Worker
 ↓
Load generation
 ↓
Load relevant assets
 ↓
Build AI request
 ↓
Model Router
 ↓
AI Provider
 ↓
Receive image
 ↓
Upload to S3
 ↓
Update PostgreSQL
 ↓
Publish event
```

Frontend:

```text
jobId
 ↓
TanStack Query polling or SSE
 ↓
queued
processing
completed / failed
```

---

# 21. AI Provider Architecture

Never couple application logic directly to a provider SDK.

Use:

```text
ImageProvider
├── generate()
├── edit()
├── variations()
└── supportedCapabilities()
```

Providers:

```text
providers/
├── google/
├── openai/
├── flux/
├── ideogram/
└── xai/
```

Initial implementation:

```text
Google
OpenAI
```

Later providers can be added without changing the core generation system.

---

# 22. AI Application and Agent Architecture

The AI layer should use a small number of purpose-specific abstractions rather than introducing multiple overlapping frameworks.

Vercel AI SDK is used where the product needs AI application features such as streaming, structured outputs, tool calls, and the Creative Assistant UI.

LangGraph is reserved for genuinely multi-step agentic workflows where the agent needs state, branching, tool usage, evaluation, retries, or human approval. It should not wrap simple image-generation calls unnecessarily.

Direct Gemini and OpenAI SDKs remain behind our provider abstraction for model-specific capabilities.

```text
Vercel AI SDK
      ↓
Hono API (Lambda)
      ↓
Our AI abstraction
      ├── Gemini
      └── OpenAI

Creative Agent workflows
      ↓
LangGraph
      ↓
AI tools / providers / workspace context
```

Inngest owns durable application execution around these AI operations. LangGraph owns the agent's reasoning/state graph when an agentic workflow is required.

When an AI job completes, the Inngest function may enqueue an **SQS email task** — email delivery itself is not an Inngest workflow.

---

# 23. Model Router

The model router decides which provider/model should handle a request.

Input:

```text
Task
Quality
Resolution
Text requirement
References
Editing
Cost preference
User plan
```

Example:

```text
App Icon
 ↓
Design-oriented model

Normal social image
 ↓
Cost-efficient general model

Complex editing
 ↓
Premium editing model

Text-heavy thumbnail
 ↓
Typography-optimized model
```

The router should support both:

```text
Auto
```

and:

```text
Manual model selection
```

Advanced users can choose the model themselves.

---

# 24. Usage and Credits

Every AI operation should be tracked.

```text
Generation
 ↓
Provider
 ↓
Model
 ↓
Input
 ↓
Output
 ↓
Estimated provider cost
 ↓
Credits consumed
```

Example internal configuration:

```text
Gemini 2.5 Flash Image   1 credit
GPT Image                5 credits
Premium generation       8 credits
```

These values are configurable and should not be hard-coded into business logic.

---

# 25. Image Generation Status

Generation states:

```text
CREATED
QUEUED
PROCESSING
UPLOADING
COMPLETED
FAILED
CANCELLED
```

Every transition should be observable.

---

# 26. Retry Architecture

Transient failures should be retried at the appropriate layer.

**AI workflows (Inngest):**

```text
Inngest function
 ↓
AI Provider
 ↓
Failure
 ↓
Inngest step retry (with backoff)
 ↓
Failure after max attempts
 ↓
Mark generation FAILED + notify user
```

**Non-AI tasks (SQS):**

```text
SQS
 ↓
Email / cleanup worker
 ↓
Failure
 ↓
Retry (visibility timeout)
 ↓
Failure
 ↓
Dead Letter Queue
```

The system should avoid duplicate generations using idempotency keys, Inngest event IDs, and job IDs.

---

# 27. Phase 2: Video Platform

After the image platform is stable, we add video.

The video system is not just a video editor. It is an AI content-repurposing engine.

User uploads:

```text
BMSD-Final.mp4
60 minutes
```

The platform can produce:

- Important frames
- Highlights
- Shorts
- Reels
- TikTok clips
- Captions
- Titles
- Hooks
- Descriptions
- Thumbnails
- Social creatives

---

# 28. Video Upload Flow

```text
Browser
 ↓
S3
 ↓
Video Asset Created
 ↓
Video Analysis Job
 ↓
Inngest
```

For large videos, uploads should use multipart/presigned upload mechanisms.

The API should not proxy large video files through the Node.js server.

---

# 29. Video Analysis Pipeline

```text
Video
 ↓
Metadata extraction
 ↓
Scene detection
 ↓
Audio extraction
 ↓
Transcription
 ↓
Transcript with timestamps
 ↓
Candidate moments
 ↓
Visual analysis
 ↓
AI ranking
 ↓
Recommended clips
```

Technology:

- FFmpeg
- ffprobe
- Amazon Transcribe
- AI vision-capable models
- Inngest (orchestration for AI/analysis steps)
- S3
- EC2 Docker workers (FFmpeg / MediaConvert)
- AWS MediaConvert where appropriate

---

# 30. Finding Important Moments

We should not rely on a single AI request.

The system combines signals:

```text
Transcript importance
+
Visual importance
+
Scene boundaries
+
Audio peaks
+
Speaker/activity signals
+
AI semantic analysis
```

Then:

```text
Candidate Score
```

Example:

```text
97%  Final winning moment
94%  Emotional reaction
91%  Funny team moment
87%  Important announcement
```

The user can preview and approve candidates.

This human-in-the-loop design is important because "interesting" is subjective.

---

# 31. Clip Generation

Once a candidate is approved:

```text
Start: 00:27:12
End:   00:27:48
```

Deterministic processing creates the clip.

Technology:

- FFmpeg for our own processing
- AWS MediaConvert for managed transcoding workflows

Output:

```text
Original 16:9
       ↓
Reframe
       ↓
9:16
       ↓
Short/Reel
```

---

# 32. Smart Vertical Reframing

For horizontal video converted to vertical:

```text
1920 × 1080
       ↓
1080 × 1920
```

The system should track important subjects.

Possible technology:

- Face detection
- Object detection
- Tracking
- Scene analysis
- AI-assisted framing

The crop should move when the important subject changes position.

---

# 33. Captions

Amazon Transcribe provides timestamped transcription.

The system can generate:

- SRT
- VTT
- Styled captions

For highly customized captions:

```text
Transcript
 ↓
Caption timing
 ↓
ASS subtitle generation
 ↓
FFmpeg
 ↓
Rendered video
```

Future versions can provide animated caption styles.

---

# 34. AI Hook and Title Generation

For each selected clip:

```text
Transcript
+
Workspace context
+
Clip context
 ↓
AI
 ↓
Hook
Title
Description
Hashtags
```

Example:

```text
Hook:
THE MOMENT THEY REALIZED THEY WON

Title:
Jonathan's BMSD 2026 Victory
```

The user can edit before export.

---

# 35. Video Thumbnail Generation

Video and image systems connect.

```text
Video
 ↓
Important frame
 ↓
Image AI
 ↓
Thumbnail
```

Example:

> Create a YouTube thumbnail from this winning moment, preserve the subject's identity, emphasize the trophy, and leave space for headline text.

---

# 36. Content Repurposing

One long-form video can become:

```text
1 YouTube Video
       ↓
├── 10 Shorts
├── 5 Thumbnail concepts
├── 20 Important frames
├── 10 Instagram posts
├── Captions
├── Titles
├── Hooks
└── Social descriptions
```

This is a major future product capability.

---

# 37. Projects and Campaigns

Projects allow users to manage a complete content operation.

Example:

```text
BMSD 2026 Campaign

Assets
Videos
Images
Thumbnails
Shorts
Templates
Generated Content
```

Campaign workflows can later support content calendars and approvals.

---

# 38. Collaboration

Workspaces can support:

```text
Owner
Admin
Editor
Designer
Viewer
```

Future collaboration features:

- Comments
- Mentions
- Direct messages
- Approval workflows
- Activity feed
- Shared projects

If high-volume activity or messaging access patterns justify it, DynamoDB can be used for those workloads.

---

# 39. Database Architecture

## PostgreSQL (Docker on EC2)

Primary relational source of truth. **V1 runs Postgres in Docker on a single EC2 instance** (same host as Redis) to minimize cost and maximize Docker learning.

Tables:

```text
users
workspaces
workspace_members
projects
assets
asset_versions
generations
generation_outputs
generation_jobs
templates
brand_kits
usage_records
notifications
```

Use:

```text
Drizzle ORM
```

No Prisma.

**Upgrade path:** migrate Postgres to **Amazon RDS** when reliability requirements (automated backups, Multi-AZ) outweigh self-managed ops. Lambda functions connect to Postgres over VPC.

Automated backups in V1: scheduled `pg_dump` to S3 (EventBridge + Lambda).

## DynamoDB

Use only for workloads where DynamoDB is genuinely beneficial.

Potential workloads:

```text
workspace activity
high-volume events
direct messages
conversation messages
```

Example messaging access pattern:

```text
PK = conversationId
SK = timestamp#messageId
```

## Redis (Docker on EC2)

Redis is a cache, not the source of truth. **V1 runs Redis in Docker on EC2** — not ElastiCache (no meaningful free tier).

Use for:

- API caching
- Rate limiting
- Temporary job state
- Frequently accessed workspace context
- Locks
- Short-lived data

Local:

```text
Docker Compose (PostgreSQL + Redis)
```

Production:

```text
EC2 Docker Compose (PostgreSQL + Redis)
```

**Upgrade path:** ElastiCache when traffic or HA requirements justify the cost.

---

# 40. AWS Infrastructure

The project is deployed on AWS with a **Lambda-first, cost-first** architecture. Avoid always-on services (ALB, ECS Fargate, ElastiCache, NAT Gateway) until traffic and revenue justify them.

Core AWS services (V1):

```text
Route 53
Amplify Hosting      # Next.js frontend (CDN + SSR/SSG compute included)
API Gateway          # HTTP API → Lambda
Lambda               # Primary backend compute (API, Inngest, jobs)
ECR                  # Lambda container images (Docker-based deploys)
EC2                  # Docker Compose: PostgreSQL + Redis
S3                   # Media and file storage
CloudFront           # S3 media delivery (optional in front of assets)
SQS                  # Email and background tasks (non-AI)
SES                  # Transactional email
SSM Parameter Store  # Secrets and config
CloudWatch           # Logs and alarms
ACM                  # TLS certificates (Amplify + API custom domains)
Terraform            # Infrastructure as code
```

Deferred until needed:

```text
RDS                  # Upgrade from EC2 Postgres
ElastiCache          # Upgrade from EC2 Redis
ALB                  # Not needed with API Gateway + Amplify
ECS/Fargate          # Not needed for V1 (Lambda-first)
DynamoDB             # Phase 5+ activity/messaging if justified
SNS                  # Optional; SQS → Lambda → SES is enough for V1
NAT Gateway          # Avoid in dev/staging; use VPC endpoints where needed
```

Platform services (non-AWS, managed):

```text
Inngest        # AI/media durable workflows
Better Auth    # Self-hosted auth (runs on Lambda + Postgres)
```

The architecture should use AWS services for legitimate workloads rather than artificially adding services.

---

# 41. High-Level AWS Architecture

```text
                              INTERNET
                                 │
                              Route 53
                    ┌────────────┴────────────┐
                    │                         │
             app.pralay.com              api.pralay.com
                    │                         │
           Amplify Hosting              API Gateway
           (Next.js apps/web)                │
         SSG / CSR / proxy.ts          ┌─────┴─────┐
                    │                  │     │     │
                    │               Lambda Lambda Lambda
                    │                (api)(inngest)(jobs)
                    │                  │     │     │
                    └──────────┬───────┴─────┴─────┘
                               │         (VPC)
                               │
                    EC2 Docker Compose
                    ├── PostgreSQL
                    └── Redis

S3 (uploads / generated / thumbnails)
   └── CloudFront (media CDN, optional)

Inngest Cloud ──► Lambda (inngest) ──► Gemini / OpenAI
                         │
                         ├──► S3
                         ├──► PostgreSQL
                         └──► SQS ──► Lambda (email) ──► SES

S3 upload ──event──► Lambda (thumbnail)

Observability: CloudWatch
Secrets: SSM Parameter Store
IaC: Terraform
CI/CD: GitHub Actions + Amplify (web) + ECR/Lambda (api/workers)
```

---

# 42. Compute Strategy (Lambda-first + Amplify)

V1 uses **pay-per-use compute** for application logic and **one small EC2 instance** for stateful Docker services.

## AWS Lambda (primary compute)

Use Lambda (Docker container images via ECR) for:

- **HTTP API** — Hono + Better Auth (`apps/api`)
- **AI workflows** — Inngest function handlers (`apps/inngest`)
- **Background jobs** — SQS email consumer, S3 thumbnail handler (`apps/jobs`)
- **Maintenance** — Postgres backup to S3, cleanup tasks

Lambda connects to PostgreSQL and Redis on EC2 through a **VPC**. Use **VPC endpoints** for S3/SQS/SSM to avoid NAT Gateway cost where possible.

## AWS Amplify Hosting (frontend)

Use **Amplify** for `apps/web` (Next.js):

- Git-based CI/CD, preview branches, custom domain, TLS
- Built-in CDN (CloudFront-backed) for static assets and SSG pages
- Managed SSR compute when needed (share pages, etc.)
- No EC2/nginx/TLS management for the frontend

## EC2 + Docker (data plane + heavy media later)

Use EC2 for:

- **PostgreSQL** and **Redis** in Docker Compose (V1)
- **FFmpeg / video processing** (Phase 2+) — CPU-heavy, long-running; not Lambda

Do **not** use EC2 to host the Next.js frontend in V1 — Amplify handles that.

## What we are not using in V1

```text
ECS / Fargate     # Replaced by Lambda + Amplify
ALB               # Replaced by API Gateway + Amplify
ElastiCache       # Replaced by Redis on EC2
RDS               # Replaced by Postgres on EC2 (upgrade path documented)
Docker Swarm      # Unnecessary — Compose on one EC2 is enough
```

**Upgrade path:** ECS/Fargate + RDS + ElastiCache when scale, SLA, or team ops maturity requires it.

---

# 43. Load Balancing and Scaling

Frontend (Amplify):

```text
User
 ↓
Amplify CDN (CloudFront-backed)
 ↓
SSG pages (cached at edge)
CSR app assets (cached at edge)
SSR pages (Amplify managed compute, when used)
```

API (Lambda + API Gateway):

```text
User / Inngest
 ↓
API Gateway (HTTP API)
 ↓
Lambda (api | inngest | jobs)
 ↓
Auto-scales per request — no always-on cost
```

AI processing:

```text
Inngest concurrency / backlog
 ↓
Lambda concurrency limits (inngest function)
 ↓
Optional: raise memory/timeout per function
```

Email and SQS-backed tasks:

```text
SQS queue depth
 ↓
Lambda event source mapping
 ↓
More concurrent Lambda executions
```

Data plane (EC2):

```text
Single EC2 Docker Compose (V1)
 ↓
Upgrade: larger instance or separate EC2 for video workers
```

This gives cost-efficient scaling for a early-stage product:

```text
Marketing traffic   → Amplify CDN (cheap/free tier)
API traffic         → Lambda (pay per request)
AI jobs             → Inngest + Lambda
Email/background    → SQS + Lambda
Database/cache      → EC2 Docker (fixed low cost)
```

---

# 44. S3 Architecture

S3 stores:

```text
uploads/
generated/
thumbnails/
videos/
clips/
exports/
temporary/
```

Use presigned URLs for large direct browser uploads/downloads where appropriate.

The API should not become a bottleneck for large media transfers.

---

# 45. CloudFront

CloudFront is used for **S3 media delivery** in V1 (optional but recommended for generated images and thumbnails). **Next.js is served by Amplify**, which includes its own CDN — do not put a separate CloudFront distribution in front of Amplify unless you have a specific reason.

Use CloudFront in front of:

- S3 uploads, generated images, thumbnails, exports
- Video outputs (Phase 2+)

Amplify Hosting already provides CDN + managed SSR/SSG compute for `apps/web`.

Architecture:

```text
User
 ↓
app.pralay.com → Amplify (Next.js + built-in CDN)

media.pralay.com (optional)
 ↓
CloudFront
 ↓
S3 (uploads / generated / thumbnails)
```

Caching policies must be carefully configured for private workspace assets (signed URLs or short-lived access).

---

# 46. SQS

SQS is for **non-AI background work only**. All AI generation, editing, batch, video analysis, and media-intelligence pipelines run through Inngest.

Use SQS when the task is simple, high-volume, and does not need multi-step durable orchestration:

```text
email-delivery
notification-delivery
webhook-dispatch
cleanup
maintenance
```

Typical flow for email:

```text
API / Inngest completion handler
 ↓
Publish to SQS (email queue)
 ↓
Email Lambda
 ↓
SES
```

Dead-letter queues capture repeatedly failing SQS messages. Inngest handles its own retry and failure semantics for AI workflows separately.

---

# 47. Lambda

Lambda is the **primary compute layer** for V1 — not just lightweight utilities.

Deploy as **Docker container images** (ECR) built from the monorepo. Bun for local dev; Node.js 20 base image in production is the safe default.

Functions:

```text
api          Hono + Better Auth + REST API (API Gateway)
inngest      Inngest AI/media workflow steps
jobs-email   SQS → SES (invites, job-complete notifications)
jobs-media   S3 event → thumbnail/metadata (optional)
maintenance  Scheduled Postgres backup to S3 (optional)
```

Also suitable for:

- S3 event handling
- Metadata processing
- Cleanup
- Notification triggers

Heavy FFmpeg/video processing should **not** use Lambda (15-minute limit, CPU/memory constraints). Use **EC2 Docker workers** in Phase 2+.

---

# 48. SNS and SES

SNS handles application events/notifications.

Example:

```text
Generation Completed (Inngest)
        ↓
   Enqueue SQS (email)
        ↓
   Email worker
        ↓
       SES
        ↓
Email
```

Email examples:

- Image generation completed
- Batch generation completed
- Video processing completed
- Workspace invitation
- Important account notification

---

# 49. CloudWatch

Monitor:

- API Gateway latency and 5xx errors
- Lambda errors, duration, and concurrency
- Amplify build failures
- EC2 CPU/memory/disk (Postgres + Redis)
- Worker failures
- Generation duration
- Provider failures
- Database metrics
- Redis metrics

Create alarms for important failures.

---

# 50. CI/CD

GitHub Actions is the CI platform for Lambda, tests, and shared packages.

```text
GitHub
 ↓
Pull Request
 ↓
Lint + Typecheck + Tests
 ↓
Build Lambda Docker images
 ↓
Push to ECR
 ↓
Update Lambda functions (Terraform or AWS CLI)
```

Frontend (`apps/web`) deploys through **Amplify Hosting** (Git-connected):

```text
GitHub push
 ↓
Amplify build (next build)
 ↓
Deploy to Amplify CDN + SSR/SSG compute
 ↓
Preview branch per PR (optional)
```

Environments:

```text
development
staging
production
```

Deployments should support rollback. Amplify supports instant rollback to previous deploys; Lambda can pin previous ECR image tags.

---

# 51. Docker

Docker is used for **Lambda deploy artifacts** and the **EC2 data plane** — not for hosting the Next.js frontend in V1.

## Lambda (application code)

Each backend app builds a Docker image → ECR → Lambda:

```text
apps/
├── api/              # Hono + Better Auth
├── inngest/          # Inngest functions
└── jobs/             # SQS + S3 handlers
```

## EC2 (stateful services)

```text
infra/ec2/
└── docker-compose.yml
    ├── postgres
    └── redis
```

Recommended instance: `t4g.small` (Postgres + Redis on one box).

Local development mirrors production data services:

```text
docker compose up    # PostgreSQL + Redis
bun run dev:api      # Hono locally (same code as Lambda)
bun run dev:web      # Next.js locally
```

## Frontend

`apps/web` is deployed to **Amplify**, not Docker on EC2. Docker is not required to run Next.js in production for V1.

We do **not** use Docker Swarm or ECS for V1.

---

# 52. Infrastructure as Code

Use **Terraform** to define AWS resources as code (`.tf` files) instead of clicking in the AWS Console.

```text
terraform plan    → preview changes
terraform apply   → create/update infrastructure
terraform destroy → tear down (save money in dev)
```

Why Terraform:

- Reproducible environments (dev/staging/prod)
- Version-controlled infrastructure in Git
- Safer than manual Console changes

Terraform will manage:

```text
VPC + security groups + VPC endpoints
EC2 (Docker Compose host)
Lambda + API Gateway
ECR repositories
S3 buckets
SQS queues
SES domain identity
SSM parameters
CloudFront (S3 media, optional)
Route 53 records
CloudWatch log groups/alarms
IAM roles
```

Amplify app connection can be managed via Amplify console initially; add to Terraform when comfortable.

Infrastructure should be reproducible rather than manually configured.

---

# 53. Monorepo Architecture

Use a **Bun workspaces monorepo**. Bun is a strong fit here: fast installs, native TypeScript execution, and a simple workspace model that keeps the learning surface focused on the product rather than tooling complexity.

```text
pralay/
├── apps/
│   ├── web/                 # Next.js
│   ├── api/                 # Hono API (Lambda container)
│   ├── inngest/             # Inngest functions (Lambda container)
│   └── jobs/                # SQS + S3 handlers (Lambda container)
├── packages/
│   ├── db/                  # Drizzle schema + migrations
│   ├── auth/                # Better Auth config + helpers
│   ├── ui/                  # Shared shadcn/ui components
│   ├── ai/                  # Provider abstraction + model router
│   └── config/              # Shared ESLint/TypeScript configs
├── bunfig.toml
├── package.json             # Bun workspaces root
└── turbo.json               # Optional: Turborepo for build caching
```

Principles:

- **Bun** for package management, scripts, and local dev execution
- **Shared packages** for anything used by more than one app (DB schema, auth, UI, AI types)
- **Apps stay thin** — route handlers and UI compose shared packages
- **Turborepo is optional** — add it when build/test caching across apps becomes worth the setup

Local development:

```text
bun install
bun run dev          # all apps via turbo or root scripts
docker compose up    # PostgreSQL + Redis
```

---

# 54. Authentication

Use **Better Auth** as the authentication system.

Better Auth is the right choice for this project because the goal is to **learn auth properly** while still moving fast:

- **Self-hosted** — sessions, cookies, and credentials live in our PostgreSQL database; no black-box SaaS
- **Drizzle adapter** — fits the chosen ORM without a separate auth database
- **Next.js + Hono** — web UI on Amplify; auth and API on Lambda with shared `packages/auth`
- **Real-world features** — email/password, OAuth (Google/GitHub), email verification, password reset, session management
- **Extensible** — workspace membership, roles, and invitations are application logic we build on top, which is valuable learning

What we are **not** using for V1:

- **Clerk / Auth0** — excellent products, but they hide too much of the auth flow for a learning-focused build
- **Hand-rolled JWT-only auth** — teaches the wrong lessons (easy to get sessions, refresh, and CSRF wrong)

Suggested auth tables (via Better Auth + Drizzle):

```text
user
session
account          # OAuth provider links
verification     # email verification tokens
```

Application-level tables we add:

```text
workspace
workspace_member
workspace_invite
```

Auth flow:

```text
Browser
 ↓
Next.js on Amplify (Better Auth client UI only)
 ↓
api.pralay.com (Hono Lambda + Better Auth handler)
 ↓
PostgreSQL on EC2 (sessions/users)
 ↓
Session cookie on parent domain (.pralay.com)
 ↓
TanStack Query → API with cookie
 ↓
Workspace authorization in Hono middleware
```

Domains:

```text
app.pralay.com   → Amplify (Next.js)
api.pralay.com   → API Gateway → Lambda (Hono)
```

Every API route that touches workspace resources must verify both **authentication** (valid session) and **authorization** (workspace membership + role).

---

# 55. Frontend Architecture

Technology:

- Next.js (App Router)
- TypeScript
- Zustand
- TanStack Query v5
- Tailwind CSS
- shadcn/ui

## Deployment: AWS Amplify Hosting

`apps/web` deploys to **Amplify Hosting** (not Docker on EC2, not ECS).

Why Amplify for V1:

- Built-in CDN, Git CI/CD, preview branches, TLS, custom domain
- Strong free tier for early traffic
- Supports SSG, CSR, SSR, ISR, and `next/image`
- No nginx/ALB/always-on EC2 cost for the frontend

Connect the GitHub repo; Amplify runs `next build` and hosts the app at `app.pralay.com`.

Environment variables (Amplify console):

```text
NEXT_PUBLIC_API_URL=https://api.pralay.com
```

## Rendering strategy

| Area                       | Strategy                 | Examples                               |
| -------------------------- | ------------------------ | -------------------------------------- |
| Marketing / legal          | **SSG** (+ CSR islands)  | `/`, `/pricing`, `/features`           |
| Auth pages                 | **Static + CSR forms**   | `/login`, `/signup`                    |
| Logged-in product          | **CSR** + TanStack Query | `/dashboard`, `/workspaces/**`, studio |
| Public share links (later) | **SSR or ISR**           | `/share/[token]`                       |

The logged-in app is **client-rendered** — data comes from the Hono Lambda API, not Next SSR. This keeps Amplify SSR costs low and fits TanStack Query polling for generation jobs.

## Auth routing: `proxy.ts` (Next.js 16+)

Use **`proxy.ts`** (not deprecated `middleware.ts`) for thin route gates only:

- Redirect unauthenticated users away from `/dashboard` and `/workspaces`
- Redirect authenticated users away from `/login`

Real session validation happens in **`(app)/layout.tsx`** (Server Component calling the API) and on the **Hono Lambda** for every mutating request.

```text
proxy.ts        → fast cookie presence check + redirect
Server layout   → validate session with API
Hono API        → authoritative auth + workspace permissions
```

## Route structure

```text
app/
├── (marketing)/     SSG — landing, pricing, legal
├── (auth)/          login, signup (CSR forms)
└── (app)/           dashboard, workspaces, studio (CSR, noindex)
```

We will use **Zustand** for client-side UI/application state.

Examples:

- Editor state
- Selected assets
- Modal state
- Workspace UI state
- Generation form state where appropriate
- Temporary client-side editor state

We will use **TanStack Query** for server state:

- API requests to `api.pralay.com`
- Caching
- Refetching
- Mutations
- Job status polling
- Pagination
- Infinite queries

We should not put server data into Zustand unnecessarily.

---

# 56. Frontend State Principle

```text
Zustand
=
Client state

TanStack Query
=
Server state

URL
=
Shareable/navigation state

React local state
=
Small component-local state
```

This separation should be maintained throughout the application.

---

# 57. Backend Architecture

**Hono** on **AWS Lambda** (Docker container via ECR). Bun for local dev; Node.js 20 in the Lambda container image.

API Gateway HTTP API routes to the `api` Lambda. Better Auth handler lives in this app — not in Next.js.

Suggested structure:

```text
apps/api/

src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── workspaces/
│   ├── projects/
│   ├── assets/
│   ├── generations/
│   ├── templates/
│   ├── videos/
│   ├── notifications/
│   └── usage/
│
├── infrastructure/
│   ├── database/
│   ├── redis/
│   ├── s3/
│   ├── inngest/
│   ├── sqs/
│   └── ai/
│
├── middleware/
├── routes/
├── lambda.ts          # Lambda handler (Hono + API Gateway adapter)
├── config/
└── app.ts             # Hono app (shared with local dev server)
```

The backend should follow modular boundaries rather than becoming one large controller/service layer.

Local dev runs the same Hono `app.ts` with `bun run dev` against Docker Compose Postgres/Redis.

---

# 58. Worker Architecture

Workers are **separate Lambda functions** — not ECS services. They share `packages/db`, `packages/ai`, and `packages/auth` with the API.

```text
apps/
├── web/        → Amplify Hosting
├── api/        → Lambda (Hono + Better Auth)
├── inngest/    → Lambda (Inngest AI/media functions)
└── jobs/       → Lambda (SQS email, S3 thumbnail)
```

AI worker (Inngest on Lambda):

```text
Inngest Cloud
 ↓
API Gateway → Lambda (inngest)
 ↓
Load generation + assets
 ↓
Model Router
 ↓
AI Provider
 ↓
S3
 ↓
PostgreSQL
 ↓
Enqueue SQS (optional: email notification)
```

Background jobs (Lambda):

```text
SQS (email) ──► Lambda (jobs/email) ──► SES
S3 event    ──► Lambda (jobs/thumbnail) ──► S3 + PostgreSQL
```

**V1 shortcut:** serve Inngest from the same `api` Lambda at `/api/inngest` before splitting to `apps/inngest` when AI load grows (separate memory/timeout/concurrency).

Video AI steps run as Inngest workflows on Lambda. Heavy FFmpeg/MediaConvert runs on **EC2 Docker workers** (Phase 2+) — triggered from Inngest, not Lambda.

---

# 59. API Principles

Use REST initially.

Example:

```text
POST   /api/v1/generations
GET    /api/v1/generations/:id
POST   /api/v1/generations/:id/cancel

POST   /api/v1/assets/upload
GET    /api/v1/assets
GET    /api/v1/assets/:id
DELETE /api/v1/assets/:id

POST   /api/v1/workspaces
GET    /api/v1/workspaces
GET    /api/v1/workspaces/:id

POST   /api/v1/projects
GET    /api/v1/projects/:id

POST   /api/v1/templates
GET    /api/v1/templates
```

Use API versioning:

```text
/api/v1
```

---

# 60. Real-Time Job Updates

Generation and video jobs can take time.

Use:

- TanStack Query polling initially
- SSE for efficient live status updates
- WebSockets only if real-time collaboration later requires them

Initial approach:

```text
POST generation
 ↓
jobId
 ↓
TanStack Query
 ↓
GET job status
```

Then upgrade to:

```text
SSE
 ↓
job status events
```

---

# 61. Search

Initial search:

- PostgreSQL metadata
- Tags
- Names
- Projects
- Workspace filters

Future semantic search:

```text
User query
 ↓
Embedding
 ↓
Vector search
 ↓
Relevant assets
 ↓
AI context
```

We should not introduce a dedicated vector database until the product actually needs one.

---

# 62. Security and Permissions

Application-level security is required even though the AWS security/governance ecosystem is not the primary learning target.

Every resource must be workspace-aware.

Example:

```text
User
 ↓
Workspace membership
 ↓
Permission check
 ↓
Resource access
```

A user must never be able to access another workspace's assets or generations by changing an ID in the URL.

---

# 63. Cost-Conscious Architecture

The project should prioritize AWS Free Tier/credits and low-cost services where possible.

Principles:

- **Lambda-first backend** and **Amplify frontend** — pay per use, not 24/7 ECS/ALB
- **One EC2 Docker box** for Postgres + Redis — skip RDS and ElastiCache in V1
- Avoid unnecessary always-on resources (no NAT Gateway in dev; no Multi-AZ RDS early)
- Destroy expensive dev resources when not needed (`terraform destroy` on EC2)
- Use S3 for media rather than database storage
- Use Inngest for AI/media workflows; use SQS + Lambda for email
- Amplify and Lambda free tiers for early traffic
- Keep CloudWatch log retention short (7–14 days in dev)
- Monitor AWS spending continuously

The architecture should remain production-oriented without pretending that every AWS service is free.

---

# 64. Development Strategy

We will not build the entire platform simultaneously.

## Stage 1

Foundation:

```text
Bun workspaces monorepo
Next.js (apps/web)
Hono API (apps/api) — local dev + Lambda-ready
Amplify Hosting connected to GitHub
PostgreSQL + Redis (Docker Compose locally)
EC2 Docker Compose (staging/production data plane)
Drizzle
Better Auth on Hono Lambda
Workspace system
Terraform (minimal: EC2, S3, VPC)
```

## Stage 2

Image foundation:

```text
S3 + presigned uploads
Asset library
Generation records
AI provider abstraction
Gemini integration
OpenAI integration
Lambda deploy pipeline (ECR)
API Gateway custom domain (api.pralay.com)
Amplify custom domain (app.pralay.com)
```

## Stage 3

Image generation:

```text
Inngest
Durable image workflow on Lambda
Generation pipeline
Independent step retries
Job status (TanStack Query polling)
S3 outputs
Gallery
SQS + Lambda + SES email on completion
```

## Stage 4

Image editor:

```text
Editing
Versions
Variations
Resize
Export
```

## Stage 5

Creative features:

```text
Brand Kit
Templates
Batch generation
Usage/credits
AI context
```

## Stage 6

Production hardening:

```text
CloudWatch alarms
SSM secrets
CloudFront for S3 media (optional)
Postgres backup Lambda → S3
VPC endpoints (avoid NAT Gateway)
GitHub Actions → ECR → Lambda
Terraform coverage expanded
Evaluate RDS / ElastiCache upgrade if needed
```

## Stage 7

Video:

```text
Video upload to S3
Inngest durable workflow (Lambda)
Transcription
Scene analysis
Highlights
EC2 Docker FFmpeg workers
Clip generation
Captions
Vertical reframing
Thumbnails
```

---

# 65. Final Product Flow

The core image experience:

```text
LOGIN
  ↓
WORKSPACE
  ↓
ASSETS / BRAND KIT
  ↓
CREATE
  ↓
GENERATE / EDIT
  ↓
SELECT REFERENCES
  ↓
SET FORMAT
  ↓
AI CONTEXT
  ↓
MODEL ROUTER
 ↓
INNGEST
 ↓
LAMBDA (AI WORKER)
  ↓
AI PROVIDER
  ↓
S3
  ↓
GENERATION RESULT
  ↓
EDIT / RESIZE / VARIATIONS
  ↓
PROJECT / LIBRARY
  ↓
EXPORT / SHARE
```

The future video experience:

```text
UPLOAD VIDEO
  ↓
S3
  ↓
ANALYSIS JOB (Inngest)
 ↓
TRANSCRIBE + SCENE ANALYSIS
  ↓
AI MOMENT DETECTION
  ↓
CANDIDATE CLIPS
  ↓
USER APPROVAL
  ↓
FFMPEG / MEDIACONVERT
  ↓
9:16 REFRAME
  ↓
CAPTIONS
  ↓
SHORT / REEL
  ↓
AI THUMBNAIL
  ↓
EXPORT
```

---

# 66. Final Architecture Philosophy

The platform should be built around five principles:

### 1. Workspace-first

All creative context belongs to a workspace.

### 2. Asset-first

Images and videos are reusable assets, not disposable AI outputs.

### 3. Job-based

Long-running AI and media processing is asynchronous.

### 4. Provider-agnostic

The application should not be locked to one AI provider.

### 5. Production-oriented

The application should be deployable on real AWS infrastructure from the beginning.

### 6. Cost-first

Prefer Lambda, Amplify free tier, and a single EC2 Docker data plane over always-on ECS/ALB/ElastiCache until scale requires otherwise.

---

# 67. Initial V1 Scope

The first production milestone is intentionally image-focused.

V1 should contain:

```text
Better Auth (Hono Lambda)
Bun workspaces monorepo
Hono API on Lambda + API Gateway
Amplify Hosting (Next.js frontend)
Workspace
Brand Kit
Asset Library
Image Upload
AI Image Generation
Reference Images
AI Image Editing
Image Versions
Smart Resize
Production Presets
Batch Generation
Generation History
S3 Storage
Inngest (AI/media workflows on Lambda)
SQS + Lambda (email + background tasks)
Redis (EC2 Docker)
PostgreSQL (EC2 Docker)
Gemini
OpenAI
CloudWatch
Docker (Lambda images + EC2 data plane)
ECR
GitHub Actions
Terraform
SSM Parameter Store
SES
```

Explicitly **not** in V1 infrastructure:

```text
ECS / Fargate
ALB
RDS
ElastiCache
Docker Swarm
Next.js on EC2 Docker
```

Video is part of the product vision but is **not the first implementation priority**.

The first objective is to build a reliable image-generation/editing platform with durable asynchronous workflows, independent step retries, and a **cost-efficient AWS deployment** (Amplify + Lambda + EC2 Docker data plane).

Once that foundation is stable, the same infrastructure becomes the base for video analysis and content repurposing.
