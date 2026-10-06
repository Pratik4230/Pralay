# Create Chat and Image Generation Architecture

## The simple idea

Create is a conversation-based image workspace. A person describes an image, optionally mentions reference assets, and then refines the result through follow-up messages.

The chat assistant understands the request and decides what should happen. A separate image service creates the actual image. The application saves every important step so the conversation can be reopened and continued later.

## The complete journey

1. The person writes a request in the Create chat.
2. They can mention assets from the workspace or project library.
3. The chat sends the request to the application server.
4. The server saves the user message immediately.
5. The assistant reads the recent conversation and available reference assets.
6. The assistant decides whether the request is ordinary conversation, a clarification, a new image, an edit, or a variation.
7. If an image is needed, the assistant chooses the most useful references.
8. The application places an image job in the background queue.
9. The image worker sends the selected references and instructions to the image provider.
10. The result is saved as a project asset.
11. The chat displays the image and keeps it available for future edits.

## Main parts

### Chat screen

The browser displays the conversation, composer, reference thumbnails, loading state, errors, and generated images.

The draft message and currently staged mentions live temporarily in the browser. Saved messages, threads, assets, and generation status come from the server.

Uploads happen through the library upload flow. The chat does not upload image files directly. After an upload, the person references the asset by mentioning it in the conversation.

### Application server

The server is responsible for authentication, workspace access, project access, message storage, reference validation, assistant requests, and generation job creation.

It makes sure that a reference belongs to the same workspace or project and has not been deleted. It also prevents invalid or duplicate references from reaching the image provider.

### Chat assistant

The chat assistant uses OpenAI for conversation and decision-making.

It can search the project and workspace library, read safe asset descriptions, use public web information when appropriate, decide whether a user is requesting an image, choose references, start an image job, and check an existing job.

Only metadata is sent to the chat assistant for reference selection. Image bytes and private storage links are not sent to it.

## Reference selection

The assistant can consider up to 24 candidates for a turn. Candidates can come from current mentions, references used in recent messages, completed images created earlier in the same conversation, and strong matches found while searching the library.

The assistant chooses between zero and five final references. Current mentions are strong hints, but they are not automatically forced into the final selection.

For an edit or variation, the latest relevant generated image is normally selected first as the base image. Additional identity or style references are included only when they improve the result.

The final selected references are saved in their exact order. This makes the image result transparent and allows the next turn to use the generated image as a new reference.

## Types of image requests

### New image

A new composition may use no references or up to five references.

### Edit

An edit changes an existing reference image and must include at least one image.

### Variation

A variation changes an earlier generated result. The earlier generated result must be the first reference because it is the base image.

Short confirmations such as “yes”, “do it”, and “make that change” are treated as generation requests when the preceding conversation contains a clear pending image action.

## Background image processing

Image generation is asynchronous because image providers can take time to respond.

When the assistant starts a generation, the application creates a queued image job, records its type, prompt, ordered references, and status, and sends it to a background worker.

The worker changes the status to processing, resolves the selected assets into temporary provider-readable images, calls the image provider, downloads the result, stores it in project storage, and creates a normal project asset. The job then becomes completed or failed with an error.

The current image provider is xAI Grok Imagine. It supports a maximum of five ordered source images.

## Live chat updates

The chat uses a streaming connection for assistant responses. The stream can report the saved user message, a started generation, normal assistant text, completion, errors, and keep-alive signals during slow work.

Generation turns do not create a visible assistant acknowledgement such as “Queued”. The user sees the original request, selected thumbnails, and an image-shaped loading state instead.

If the connection ends after the user message has already been saved, the browser refreshes the conversation from the server. This prevents a network interruption from losing a completed turn.

## What is saved

The application saves conversation threads, messages, selected references, image jobs, statuses, ordered inputs, generated assets, processing events, and failure information.

The database is the source of truth. Project storage holds the actual uploaded and generated image files.

## What the person sees

- Normal questions receive normal chat replies.
- Missing or uncertain assets result in a clarification.
- Queued and processing jobs show an image-shaped loading state.
- Completed jobs show the generated image only.
- Failed jobs show a compact error and can be retried.
- Internal prompts, reference reasoning, and queue acknowledgements stay hidden.

## Current boundaries

- The assistant decides references, while the image provider only creates images.
- A generation produces one image at a time.
- Generation progress is currently checked periodically by the browser.
- Long-running conversation orchestration is not yet persisted through a dedicated workflow checkpoint system.
- Production hosting must allow the chat connection to remain open long enough for slow assistant work, or use a resumable background connection.
