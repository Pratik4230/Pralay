"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuiState } from "@assistant-ui/react";
import {
  CheckIcon,
  Loader2Icon,
  Maximize2Icon,
  PencilIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import type { Generation } from "@repo/validators";

import { useCreateGenerationsScope } from "@/features/create/components/create-generations-context";
import type { CreateGenerationBlock } from "@/features/create/types/create-ui";
import { getMediaUrl } from "@/global/utils/media-url";

type OutputAsset = NonNullable<CreateGenerationBlock["outputAssets"]>[number];
type EditorTool = "edit" | "resize";

const RESIZE_PRESETS = [
  { label: "Square", ratio: "1:1", width: 1024, height: 1024 },
  { label: "Portrait", ratio: "3:4", width: 768, height: 1024 },
  { label: "Story", ratio: "9:16", width: 576, height: 1024 },
  { label: "Landscape", ratio: "4:3", width: 1024, height: 768 },
  { label: "Widescreen", ratio: "16:9", width: 1024, height: 576 },
] as const;

function validDimension(value: string) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 8192;
}

export function CreateImageEditorDialog({
  open,
  onOpenChange,
  generation,
  outputAsset,
  type,
  initialTool = "edit",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generation?: Generation;
  outputAsset: OutputAsset;
  type: CreateGenerationBlock["type"];
  initialTool?: EditorTool;
}) {
  const { submitImageEdit, submitImageResize } = useCreateGenerationsScope();
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const [tool, setTool] = useState<EditorTool>("edit");
  const [instruction, setInstruction] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialWidth = outputAsset.width ?? 1024;
  const initialHeight = outputAsset.height ?? 1024;
  const [width, setWidth] = useState(String(initialWidth));
  const [height, setHeight] = useState(String(initialHeight));
  const [lockRatio, setLockRatio] = useState(true);
  const [lockedRatio, setLockedRatio] = useState(initialWidth / initialHeight);

  useEffect(() => {
    if (!open) return;
    const nextWidth = outputAsset.width ?? 1024;
    const nextHeight = outputAsset.height ?? 1024;
    setWidth(String(nextWidth));
    setHeight(String(nextHeight));
    setLockedRatio(nextWidth / nextHeight);
    setLockRatio(true);
    setInstruction("");
    setShowCompare(false);
    setTool(initialTool);
  }, [
    initialTool,
    open,
    outputAsset.height,
    outputAsset.id,
    outputAsset.width,
  ]);

  const source =
    type === "edit" || type === "variation" || type === "resize"
      ? generation?.inputAssets[0]
      : undefined;
  const outputUrl = getMediaUrl(outputAsset.s3Key);
  const sourceUrl = getMediaUrl(source?.s3Key);
  const canCompare = Boolean(sourceUrl);
  const widthNumber = Number(width);
  const heightNumber = Number(height);
  const resizeIsValid =
    validDimension(width) &&
    validDimension(height) &&
    widthNumber * heightNumber <= 40_000_000;
  const selectedPreset = useMemo(
    () =>
      RESIZE_PRESETS.find(
        (preset) =>
          preset.width === widthNumber && preset.height === heightNumber,
      ),
    [heightNumber, widthNumber],
  );

  function closeAfterAccepted() {
    onOpenChange(false);
    setInstruction("");
    setShowCompare(false);
  }

  async function applyEdit() {
    if (!submitImageEdit || !instruction.trim() || isSubmitting || isRunning)
      return;
    setIsSubmitting(true);
    try {
      await submitImageEdit(outputAsset, instruction, closeAfterAccepted);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start edit",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function applyResize() {
    if (!submitImageResize || !resizeIsValid || isSubmitting || isRunning)
      return;
    setIsSubmitting(true);
    try {
      await submitImageResize(
        outputAsset,
        widthNumber,
        heightNumber,
        closeAfterAccepted,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start resize",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeWidth(value: string) {
    setWidth(value);
    const next = Number(value);
    if (lockRatio && Number.isFinite(next) && next > 0) {
      setHeight(String(Math.max(1, Math.round(next / lockedRatio))));
    }
  }

  function changeHeight(value: string) {
    setHeight(value);
    const next = Number(value);
    if (lockRatio && Number.isFinite(next) && next > 0) {
      setWidth(String(Math.max(1, Math.round(next * lockedRatio))));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(94vh,980px)] max-w-[min(96vw,1440px)] flex-col gap-0 overflow-hidden bg-background p-0 sm:max-w-[min(96vw,1440px)]">
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4 text-left">
          <DialogTitle>Image editor</DialogTitle>
          <DialogDescription>
            Edit with AI or create a resized copy. The original stays unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="flex min-h-[420px] min-w-0 flex-col bg-black/95">
            <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
              <div
                className={
                  showCompare && canCompare
                    ? "grid h-full w-full gap-3 sm:grid-cols-2"
                    : "relative h-full w-full"
                }
              >
                {showCompare && sourceUrl && source ? (
                  <figure className="flex h-full min-h-0 flex-col">
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black">
                      <Image
                        src={sourceUrl}
                        alt={`Source: ${source.name}`}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                    <figcaption className="pt-2 text-center text-xs text-white/60">
                      Before · {source.name}
                    </figcaption>
                  </figure>
                ) : null}
                {outputUrl ? (
                  <figure className="flex h-full min-h-0 flex-col">
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black">
                      <Image
                        src={outputUrl}
                        alt={`Current image: ${outputAsset.name}`}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                    {showCompare && canCompare ? (
                      <figcaption className="pt-2 text-center text-xs text-white/60">
                        After · {outputAsset.name}
                      </figcaption>
                    ) : null}
                  </figure>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 p-3">
              <Button
                type="button"
                variant={tool === "edit" ? "secondary" : "ghost"}
                className="text-white hover:bg-white/15 hover:text-white"
                onClick={() => setTool("edit")}
              >
                <PencilIcon /> Edit
              </Button>
              <Button
                type="button"
                variant={tool === "resize" ? "secondary" : "ghost"}
                className="text-white hover:bg-white/15 hover:text-white"
                onClick={() => setTool("resize")}
              >
                <Maximize2Icon /> Resize
              </Button>
              {canCompare ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-white hover:bg-white/15 hover:text-white"
                  onClick={() => setShowCompare((current) => !current)}
                >
                  {showCompare ? "Show result" : "Before and after"}
                </Button>
              ) : null}
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto border-l border-border/60 p-5">
            <div className="mb-5 space-y-1 border-b border-border/60 pb-5">
              <p className="truncate text-sm font-medium">{outputAsset.name}</p>
              <p className="text-xs text-muted-foreground">
                {outputAsset.width && outputAsset.height
                  ? `${outputAsset.width} × ${outputAsset.height} px · `
                  : ""}
                {outputAsset.mimeType.replace("image/", "").toUpperCase()}
              </p>
            </div>

            {tool === "edit" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor={`edit-instruction-${outputAsset.id}`}
                    className="text-sm font-medium"
                  >
                    Describe edits
                  </label>
                  <Textarea
                    id={`edit-instruction-${outputAsset.id}`}
                    value={instruction}
                    onChange={(event) => setInstruction(event.target.value)}
                    placeholder="What should change, and what should stay the same?"
                    className="min-h-36"
                  />
                  <p className="text-xs text-muted-foreground">
                    AI editing creates a new image and may change details
                    outside the requested area.
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={
                    !instruction.trim() ||
                    isSubmitting ||
                    isRunning ||
                    !submitImageEdit
                  }
                  onClick={() => void applyEdit()}
                >
                  {isSubmitting ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <PencilIcon />
                  )}
                  {isSubmitting ? "Starting edit..." : "Apply edit"}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Aspect ratio presets</p>
                  <div className="space-y-1 rounded-xl border p-2">
                    {RESIZE_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.ratio}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setWidth(String(preset.width));
                          setHeight(String(preset.height));
                          setLockedRatio(preset.width / preset.height);
                          setLockRatio(true);
                        }}
                      >
                        <span className="flex size-4 items-center justify-center">
                          {selectedPreset?.ratio === preset.ratio ? (
                            <CheckIcon className="size-4" />
                          ) : null}
                        </span>
                        <span className="flex-1">{preset.label}</span>
                        <span className="text-muted-foreground">
                          {preset.ratio}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Output dimensions</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-xs text-muted-foreground">
                      Width
                      <Input
                        inputMode="numeric"
                        value={width}
                        onChange={(event) => changeWidth(event.target.value)}
                        aria-label="Resize width"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-muted-foreground">
                      Height
                      <Input
                        inputMode="numeric"
                        value={height}
                        onChange={(event) => changeHeight(event.target.value)}
                        aria-label="Resize height"
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={lockRatio}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setLockRatio(checked);
                        if (checked && resizeIsValid)
                          setLockedRatio(widthNumber / heightNumber);
                      }}
                    />
                    Maintain aspect ratio
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Resize uses a centered crop to fill the selected dimensions.
                    It is standard resizing, not AI upscaling.
                  </p>
                  {!resizeIsValid ? (
                    <p className="text-xs text-destructive">
                      Use dimensions from 1 to 8192 px and no more than 40
                      megapixels.
                    </p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  className="w-full"
                  disabled={
                    !resizeIsValid ||
                    isSubmitting ||
                    isRunning ||
                    !submitImageResize
                  }
                  onClick={() => void applyResize()}
                >
                  {isSubmitting ? (
                    <Loader2Icon className="animate-spin" />
                  ) : (
                    <Maximize2Icon />
                  )}
                  {isSubmitting ? "Starting resize..." : "Apply resize"}
                </Button>
              </div>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
