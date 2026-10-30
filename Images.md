Build **Pralay**, an AI-powered image generation and editing platform with a modern, minimal UI inspired by ChatGPT's image experience.

**Tech stack:** Next.js, React, TypeScript, Tailwind CSS, Node.js, PostgreSQL, Drizzle ORM, S3 storage, and Sharp. Use an AI provider abstraction so image models can be switched easily.

### 1. Image Generation

- Generate images from text prompts.
- Upload reference images for image-to-image generation.
- Select aspect ratios (1:1, 16:9, 9:16, 4:5).
- Generate image variations.
- Improve prompts using AI.
- Support different artistic styles.

### 2. Image Editing

- Edit images using natural-language instructions.
- Remove or replace backgrounds.
- Remove unwanted objects.
- Extend images beyond their original boundaries.
- Upscale images.
- Apply localized edits using selection brushes and masks when supported.

### 3. Standard Image Tools

- Crop and resize.
- Rotate and flip.
- Compress images.
- Convert PNG, JPEG, and WebP.
- Adjust brightness, contrast, saturation, and blur.
- Download images with configurable dimensions and formats.

### 4. UI and User Experience

Create a responsive interface with:

- **Sidebar:** New Image, Explore, Recent Images, Favorites, Projects, Settings.
- **Main workspace:** Prompt composer, upload button, aspect-ratio selector, style selector, Generate button, and image gallery.
- **Image preview:** Large preview with Edit, Variations, Upscale, Download, and More Actions.
- **Editor:** Image canvas, editing toolbar, contextual settings panel, Undo, Redo, and Apply Changes.
- **History:** Preserve original images and editing revisions.

When users click a tool, open the relevant panel or editor. Every button must perform its intended action.

### 5. Backend and Architecture

- Integrate AI generation and editing APIs.
- Use Sharp for conventional image processing.
- Store images in S3-compatible object storage.
- Use PostgreSQL and Drizzle ORM for metadata and history.
- Use background jobs for long-running operations.
- Implement authentication, upload validation, rate limiting, and error handling.
- Keep API keys server-side.
- Enable only features supported by the configured provider.

### 6. Design Requirements

Use a premium, minimal interface with neutral colors, clean typography, rounded controls, spacious layouts, and high-quality image previews. Support desktop, tablet, and mobile.

### 7. Implementation Priority

1. Image generation, uploads, previews, and downloads.
2. AI image editing and variations.
3. Crop, resize, compression, and format conversion.
4. Background removal, object removal, and upscaling.
5. History, projects, favorites, and production hardening.

**Instructions:** Inspect the existing codebase first. Reuse existing components and conventions. Implement features incrementally with real functionality, not placeholder buttons. Clearly identify external API requirements and unsupported capabilities.
