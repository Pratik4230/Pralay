# Pralay — Detailed Image Studio Implementation Specification

## Objective

Build **Pralay**, a polished AI image generation and editing experience. Implement the real behavior of each feature—not just a visual mockup. Follow the existing repository’s architecture and design system. Inspect the codebase before making changes, reuse existing components, and avoid unrelated rewrites.

## 1. Global UI and Navigation

Create a responsive workspace with:

- **Sidebar:** New Image, Explore, Recent Images, Favorites, Projects, Settings.
- **Main workspace:** Prompt composer, image gallery, empty states, and contextual actions.
- **Image viewer/editor:** Large preview or canvas, editing controls, and export actions.

### Interactions

- **New Image:** Reset the composer and open a blank generation workspace. Do not delete previous work.
- **Explore:** Show example prompts and images. “Use prompt” copies the selected prompt into the composer; it must not start generation automatically.
- **Recent Images:** Show the user’s recent uploaded, generated, and edited images, newest first.
- **Favorites:** Show favorited assets.
- **Projects:** Show project folders and their assets.
- **Settings:** Show available generation preferences and account settings.
- **Selecting an image:** Open its detail view with the actions supported for that asset.
- **Back navigation:** Preserve unsent prompt text and editor state where practical.
- **Mobile:** Use a navigation drawer or bottom navigation, touch-friendly controls, and a full-screen image viewer.

Include loading, empty, success, and error states. Every visible button must work or be clearly disabled with a reason.

## 2. Prompt Composer and Image Generation

### UI

Display:
- Multiline prompt input with a useful placeholder.
- Upload/reference-image button.
- Optional style selector.
- Aspect-ratio selector: 1:1, 16:9, 9:16, 4:5, and provider-supported custom sizes.
- Output-count selector only when supported.
- Generate button.
- Optional “Improve prompt” action.

### Behavior

1. Typing updates the prompt state.
2. Generate stays disabled when the prompt is blank, the request is invalid, or a required service is unavailable.
3. Clicking Generate validates the request and submits it to the backend.
4. Create a generation job and display a loading card with the submitted prompt and status.
5. Do not invent progress percentages. Use real job states such as queued, processing, completed, failed, and cancelled where supported.
6. On success, add the output to the gallery and history.
7. On failure, show a useful error with Retry and Edit Prompt actions. Preserve the prompt and reference images.
8. Prevent accidental duplicate submissions while a request is being submitted.
9. Allow cancellation only when the provider/job system supports it; communicate if cancellation is unavailable.
10. Store the prompt, selected settings, provider/model, timestamp, output asset IDs, and job status.

### Improve Prompt

- Clicking Improve Prompt sends the current text to the configured text model.
- Show the suggested prompt for review.
- Let the user accept, edit, or discard it.
- Never replace the original prompt silently or trigger image generation automatically.

### Aspect Ratios and Provider Limits

- Show only ratios/sizes supported by the active provider.
- Changing a ratio updates request settings and a preview hint, not an existing image.
- Do not claim the result has exact dimensions until confirmed by the output metadata.
- Explain when a requested option is unavailable.

## 3. Uploads and Reference Images

### UI and Behavior

- Clicking Upload opens the native file picker; drag-and-drop may also be supported.
- Validate file type, file size, and image readability before upload.
- Show thumbnail previews, filenames, and a remove button for each attachment.
- Allow users to remove an attachment before submitting.
- Display upload progress when available and clear errors for unsupported, corrupted, or oversized files.
- Preserve uploaded originals as separate assets; never overwrite them during editing.
- Store files in private object storage and use secure URLs.
- For reference-image generation, send the image and prompt to a compatible provider.
- If the selected provider does not support the requested number or type of references, explain the limit instead of silently ignoring attachments.

## 4. Image Results Gallery and Image Detail

### Gallery

- Show results as responsive image cards.
- Display a thumbnail, optional prompt summary, and processing state.
- Failed jobs show Retry and error details.
- Clicking a completed card opens the image detail view.
- Avoid showing unfinished files as completed images.

### Image Detail

Display a large image preview, filename, dimensions, format, creation date, and prompt when available.

Actions:
- Edit Image
- Create Variations
- Crop
- Resize
- Upscale
- Download
- Favorite
- Rename
- Move to Project
- More Actions
- Delete

Only show actions supported for the selected asset. Destructive actions should require confirmation when appropriate. Preserve the original asset.

## 5. Prompt-Based AI Editing

### UI

When the user clicks **Edit Image**, open an editor with:
- The selected image.
- A multiline instruction field.
- Optional reference attachments.
- Apply Changes button.
- Undo/Redo where supported.
- Before/After comparison.
- Save as New Revision action.

### Behavior

1. The original image remains unchanged.
2. The user enters an instruction, such as “Change the background to a sunset beach.”
3. Apply Changes validates the instruction and submits the image plus instruction to a compatible editing provider.
4. Show a processing state and prevent accidental duplicate submissions.
5. Display the result beside or over the original for comparison.
6. Allow the user to keep the result as a new revision, retry, or return to the original.
7. Preserve the instruction and processing metadata in history.
8. If the provider does not support image editing, show a clear unavailable-state message; do not pretend text-to-image generation is equivalent to editing the supplied image.

## 6. Image Variations

- The user clicks **Create Variations** on an image.
- Open a panel or dialog with the source image, optional instruction, and supported output count.
- Clicking Generate Variations submits the source image and settings to a compatible provider.
- Show each result as a separate card.
- Selecting a result opens its detail view.
- Allow each variation to be favorited, downloaded, edited, or used as a new source.
- Keep the source and all variations in history, with parent-child relationships.
- If variation generation is unsupported, disable the action and explain why.

## 7. Crop

### UI

Open a crop editor with:
- Interactive image preview.
- Draggable crop rectangle and resize handles.
- Aspect-ratio options: Free, Square, 4:5, 3:2, 16:9, 9:16, and Custom.
- Rotate and flip controls.
- Reset, Cancel, and Apply Crop buttons.
- Estimated output dimensions.

### Behavior

- Changing the ratio constrains the crop area.
- Dragging or resizing the crop area updates the preview.
- Apply Crop creates a new revision or derived asset; do not overwrite the original.
- Cancel discards unapplied crop changes.
- Reset restores the initial crop selection.
- Validate that the crop area is within image boundaries and has nonzero dimensions.
- Display processing errors without losing the original.

## 8. Resize

### UI

Provide:
- Width and height inputs in pixels.
- Maintain aspect ratio toggle.
- Percentage or preset sizes where useful.
- Output format selector.
- Original dimensions and estimated output dimensions.
- Cancel and Apply Resize buttons.

### Behavior

- When aspect-ratio locking is enabled, changing width updates height and vice versa.
- Reject invalid, zero, negative, or excessively large dimensions.
- Enforce configured server-side limits.
- Explain if resizing changes aspect ratio or requires cropping/padding.
- Apply Resize creates a new output asset and displays its actual dimensions.
- Conventional resizing must not be described as AI upscaling.

## 9. Rotate and Flip

Provide buttons for:
- Rotate 90° clockwise.
- Rotate 90° counterclockwise.
- Rotate 180°.
- Flip horizontally.
- Flip vertically.
- Reset, Cancel, and Apply.

Update the preview immediately where practical. Apply the selected operations to a new revision. Preserve the original and handle orientation metadata correctly.

## 10. Background Removal

- Show a **Remove Background** action on supported images.
- Clicking it opens a preview and explains that processing will create a new asset.
- Start a background-removal service and show a processing state.
- On success, display the result on a checkerboard to indicate transparency.
- Offer preview backgrounds: transparent, white, and a selected solid color.
- Allow downloading as a format that supports alpha transparency, such as PNG or WebP.
- Do not flatten transparency unless the user explicitly selects a solid background or an incompatible output format.
- If processing fails, preserve the source and provide Retry.

## 11. Background Replacement

- Open a panel with options for solid color, uploaded background, or AI-generated scene where supported.
- Let the user choose a color or upload a background.
- If using AI, provide an optional scene prompt.
- Show a preview before applying.
- Keep the foreground subject as intact as the selected service allows.
- Apply creates a new revision; Cancel leaves the source unchanged.
- Explain when subject preservation cannot be guaranteed.

## 12. Object Removal and Mask-Based Editing

### UI

Provide:
- Brush and eraser tools.
- Brush-size control.
- Clear Selection.
- Undo/Redo for mask strokes where feasible.
- Mask overlay.
- Instruction field when required.
- Remove/Apply button.

### Behavior

1. The user paints over the unwanted object or area.
2. The mask overlay clearly indicates the selected pixels.
3. The user can adjust the brush, erase parts of the mask, or clear the selection.
4. Applying submits the source image, mask, and optional instruction to a compatible inpainting/editing service.
5. Show processing state and display the result for comparison.
6. Save the result as a new revision.
7. Validate that the mask is nonempty and matches the image dimensions expected by the service.
8. If the provider does not support masks or inpainting, explain that requirement rather than returning a fake result.

## 13. Image Extension / Outpainting

- The user clicks **Extend Image**.
- Show the current image on an adjustable canvas.
- Allow expansion to the top, bottom, left, and right, or selection of a supported target aspect ratio.
- Let the user optionally describe what should appear in the newly generated areas.
- Clearly distinguish the original image area from the extension area.
- Apply submits the image, canvas dimensions, mask/boundaries, and prompt to a compatible outpainting provider.
- Preview the expanded result and save it as a new asset.
- Preserve the original image and report provider dimension limits.

## 14. Image Upscaling

- Offer supported upscale factors such as 2× or 4×, depending on the service.
- Show original dimensions and expected output dimensions.
- Distinguish standard resizing from AI upscaling.
- Submit the image to the configured upscaling service.
- Show processing state, then display a before/after comparison.
- Save the result separately and show actual output dimensions.
- Enforce maximum output dimensions and file-size limits.
- If no upscaling service is configured, explain this rather than silently performing ordinary resizing.

## 15. Filters and Adjustments

Provide sliders for supported conventional adjustments:
- Brightness
- Contrast
- Saturation
- Exposure
- Temperature
- Tint
- Highlights
- Shadows
- Blur
- Sharpen

Also offer optional presets such as grayscale and sepia.

### Behavior

- Sliders update a preview without repeatedly creating permanent files.
- Show current values and provide Reset for each control and Reset All.
- Cancel restores the state before the editing session.
- Apply creates a new revision.
- Avoid destructive changes to the source.
- Use sensible ranges and clamp invalid values.
- Clearly distinguish conventional adjustments from AI-generated changes.

## 16. Style Transformation and Product Images

### Style Transformation

- Provide a style picker with examples, such as watercolor, pencil sketch, vintage photography, and cinematic photography.
- Show the selected source image and optional instruction.
- Submit to an image-to-image provider.
- Display results as separate assets and preserve the source.
- Do not promise exact preservation of identity or details.

### Product Photography

- Allow a product image upload.
- Offer scene presets such as white studio, lifestyle, minimalist, and premium advertising.
- Allow an optional background/scene prompt.
- Generate a result using a compatible image-editing provider.
- Display source and result side by side.
- Preserve the source and disclose that AI output may alter product details.

## 17. Text and Social Graphics

- Provide a simple form for headline, supporting text, brand name, and optional call to action.
- Offer aspect-ratio presets for social posts, stories, thumbnails, website heroes, and blog images.
- Generate a background image using the configured provider.
- For exact spelling and editable text, overlay typography using HTML/SVG or another deterministic rendering method.
- Allow users to edit text, font size, alignment, and position before export.
- Preview the composition and save it as a new asset.
- Do not rely on AI-rendered text when exact wording is required.

## 18. Download and Export

Clicking **Download** should open an export dialog or menu containing:
- Supported format: PNG, JPEG, WebP, and AVIF if supported.
- Available dimensions or optional resize controls.
- Quality slider for lossy formats.
- Transparency information.
- Estimated file size when it can be calculated.
- Download and Cancel buttons.

Behavior:
- Generate the requested export from the selected revision.
- Preserve transparency for compatible formats.
- Display the actual final format, dimensions, and file size when ready.
- Use a safe filename, such as `image-name-YYYY-MM-DD.webp`.
- Ensure filename extension and MIME type match the output.
- Handle export errors and allow retry.
- Never silently modify dimensions or flatten transparency.

## 19. History, Revisions, Favorites, and Projects

### History and Revisions

Record every upload, generation, and editing operation with:
- Asset ID and parent asset ID.
- Prompt or editing instruction.
- Operation type.
- Provider/model when applicable.
- Settings.
- Storage key.
- Dimensions and format.
- Timestamp and status.

Allow users to reopen an earlier revision, compare revisions, and create a new working revision from an older one. Do not delete or overwrite earlier versions when restoring.

### Favorites

- Clicking the favorite icon toggles the favorite state.
- Persist the state across refreshes.
- Show favorited assets in the Favorites view.
- Update the icon and accessible label immediately, with error recovery if saving fails.

### Projects

- Create, rename, and delete projects.
- Move assets between projects.
- Show project contents in a responsive gallery.
- Confirm destructive actions and protect assets from accidental deletion.
- Ensure users can only access their own projects and assets.

### Delete and Trash

- Ask for confirmation before deletion.
- Prefer soft deletion if recoverability is required.
- Remove deleted assets from normal galleries.
- Provide Restore and Permanent Delete actions if Trash is implemented.
- Ensure storage cleanup does not delete files still referenced by other revisions.

## 20. Explore Gallery

- Display example images grouped by style, category, or use case.
- Each card includes a preview and concise prompt.
- Clicking a card opens its detail view.
- Clicking **Use Prompt** fills the composer but does not generate automatically.
- Clearly identify examples as sample content, not the user's generation history.
- Use properly licensed or internally created example assets.

## 21. Backend and Provider Integration

Build a provider-independent service layer with methods as supported:

- `generateImage()`
- `editImage()`
- `generateVariations()`
- `upscaleImage()`
- `removeBackground()`
- `removeObject()`
- `extendImage()`
- `getJobStatus()`
- `cancelJob()`

Keep conventional image processing separate, using a library such as Sharp for crop, resize, rotate, format conversion, compression, and supported adjustments.

Maintain capability metadata for each provider/model. Only enable actions the selected service actually supports.

Suggested API routes (adapt to existing conventions):

- `POST /api/images/generate`
- `POST /api/images/edit`
- `POST /api/images/variations`
- `POST /api/images/upscale`
- `POST /api/images/remove-background`
- `POST /api/images/remove-object`
- `POST /api/images/extend`
- `POST /api/images/resize`
- `POST /api/images/crop`
- `POST /api/images/convert`
- `POST /api/images/compress`
- `GET /api/images`
- `GET /api/images/:id`
- `GET /api/images/:id/history`
- `GET /api/jobs/:id`

Use the existing backend if one is already present. Do not create duplicate architecture unnecessarily.

## 22. Data, Storage, Security, and Reliability

Use the project's existing database and storage choices where possible. If starting from scratch, PostgreSQL with Drizzle ORM and private S3-compatible storage are suitable defaults.

Suggested entities:
- User
- Project
- ImageAsset
- ImageRevision
- GenerationJob
- Favorite
- ExportRecord

Requirements:
- Store image files in object storage, not as large database blobs.
- Keep provider credentials server-side.
- Validate authentication, ownership, MIME type, file size, dimensions, and input values on the server.
- Use signed URLs or equivalent access controls for private files.
- Add rate limits, quotas, timeouts, structured errors, and appropriate retries.
- Use background jobs for long-running operations.
- Track queued, processing, completed, failed, and cancelled states where supported.
- Use idempotency or duplicate-request protection where appropriate.
- Clean up abandoned temporary files safely.
- Do not expose internal stack traces or secrets to the client.
- Preserve source assets when any processing job fails.

## 23. Accessibility and Responsive Behavior

- Support keyboard navigation and visible focus.
- Label icon-only buttons accessibly.
- Manage focus correctly in dialogs and menus.
- Provide adequate contrast and screen-reader status announcements.
- Do not communicate status by color alone.
- On mobile, use touch-friendly controls, responsive galleries, and full-screen editing where appropriate.
- Ensure crop, brush, mask, and resize interactions work with touch input or provide an accessible alternative.

## 24. Acceptance Criteria

The feature is ready only when:
1. The UI is connected to real backend or image-processing operations.
2. Every visible control works or is explicitly disabled with an explanation.
3. Original images remain unchanged and recoverable.
4. Loading, empty, error, success, and retry states are implemented.
5. Job status reflects actual processing state.
6. Unsupported provider features are not falsely advertised.
7. Downloads use the correct format, dimensions, and MIME type.
8. Image history and revisions persist.
9. Authentication and asset ownership are enforced.
10. Desktop and mobile flows are tested.

## 25. Implementation Instructions

1. Inspect the current repository, package manager, routes, UI components, database, and existing provider integrations.
2. Summarize the existing architecture briefly before changing it.
3. Implement the work in small, testable increments while preserving current conventions.
4. Start with generation, uploads, previews, and downloads; then implement editing tools and organization.
5. Add tests for core image operations, validation, ownership, error handling, and revision preservation.
6. Document required environment variables and external services.
7. Do not use fake success responses, hardcoded generated outputs, or nonfunctional placeholder buttons.
8. If a provider or API key is missing, implement the integration boundary and show a clear configuration state.
9. Avoid unrelated refactors.
10. At the end, report what works, what requires external credentials, and what remains unimplemented.
