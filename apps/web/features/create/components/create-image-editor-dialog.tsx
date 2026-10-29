"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuiState } from "@assistant-ui/react";
import {
  CheckIcon,
  DownloadIcon,
  HistoryIcon,
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
import { useProjectGenerationHistory } from "@/features/create/hooks/use-project-generation";
import type { CreateGenerationBlock } from "@/features/create/types/create-ui";
import { getMediaDownloadUrl, getMediaUrl } from "@/global/utils/media-url";

type OutputAsset = NonNullable<CreateGenerationBlock["outputAssets"]>[number];
type EditorTool = "edit" | "resize";
type HistoryItem = {
  key: string;
  label: string;
  asset: OutputAsset;
  inputAsset: OutputAsset | null;
};

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
  workspaceId,
  projectId,
  generationId,
  generation,
  outputAsset,
  type,
  initialTool = "edit",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projectId: string;
  generationId: string;
  generation?: Generation;
  outputAsset: OutputAsset;
  type: CreateGenerationBlock["type"];
  initialTool?: EditorTool;
}) {
  const { submitImageEdit, submitImageResize } = useCreateGenerationsScope();
  const history = useProjectGenerationHistory(
    workspaceId,
    projectId,
    generationId,
    open,
  );
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const [tool, setTool] = useState<EditorTool>("edit");
  const [instruction, setInstruction] = useState("");
  const [showCompare, setShowCompare] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHistoryKey, setSelectedHistoryKey] = useState(generationId);
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
    setSelectedHistoryKey(generationId);
  }, [
    generationId,
    initialTool,
    open,
    outputAsset.height,
    outputAsset.id,
    outputAsset.width,
  ]);

  const currentSource =
    type === "edit" || type === "variation" || type === "resize"
      ? generation?.inputAssets[0]
      : undefined;
  const historyItems = useMemo<HistoryItem[]>(() => {
    if (!history.data) {
      return [
        {
          key: generationId,
          label: "Current",
          asset: outputAsset,
          inputAsset: currentSource ?? null,
        },
      ];
    }
    const items: HistoryItem[] = [];
    if (history.data?.sourceAsset) {
      items.push({
        key: `source:${history.data.sourceAsset.id}`,
        label: "Original",
        asset: history.data.sourceAsset,
        inputAsset: null,
      });
    }
    history.data?.revisions.forEach((revision, index) => {
      items.push({
        key: revision.generationId,
        label: `Revision ${index + 1}`,
        asset: revision.asset,
        inputAsset: revision.inputAsset,
      });
    });
    return items;
  }, [currentSource, generationId, history.data, outputAsset]);
  const selectedHistoryItem = historyItems.find(
    (item) => item.key === selectedHistoryKey,
  );
  const activeAsset = selectedHistoryItem?.asset ?? outputAsset;
  const source = selectedHistoryItem
    ? selectedHistoryItem.inputAsset
    : currentSource;
  const outputUrl = getMediaUrl(activeAsset.s3Key);
  const sourceUrl = getMediaUrl(source?.s3Key);
  const downloadUrl = getMediaDownloadUrl(activeAsset.s3Key);
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

  useEffect(() => {
    if (!open) return;
    const nextWidth = activeAsset.width ?? 1024;
    const nextHeight = activeAsset.height ?? 1024;
    setWidth(String(nextWidth));
    setHeight(String(nextHeight));
    setLockedRatio(nextWidth / nextHeight);
    setShowCompare(false);
  }, [activeAsset.height, activeAsset.id, activeAsset.width, open]);

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
      await submitImageEdit(activeAsset, instruction, closeAfterAccepted);
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
        activeAsset,
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
            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              <nav
                aria-label="Image revision history"
                className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 p-3 sm:w-24 sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:border-r sm:border-b-0"
              >
                <div className="hidden items-center gap-1 text-[11px] text-white/50 sm:flex">
                  <HistoryIcon className="size-3" /> History
                </div>
                {history.isLoading ? (
                  <Loader2Icon className="m-auto size-4 animate-spin text-white/50" />
                ) : null}
                {historyItems.map((item) => {
                  const selected = item.key === selectedHistoryKey;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      title={`Use ${item.label.toLowerCase()} as the editing source`}
                      aria-label={`Use ${item.label.toLowerCase()} as the editing source`}
                      aria-pressed={selected}
                      className="group w-16 shrink-0 text-left sm:w-full"
                      onClick={() => setSelectedHistoryKey(item.key)}
                    >
                      <span
                        className={`relative block aspect-square overflow-hidden rounded-lg border-2 bg-black ${
                          selected
                            ? "border-white"
                            : "border-transparent group-hover:border-white/50"
                        }`}
                      >
                        <Image
                          src={getMediaUrl(item.asset.s3Key) ?? ""}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </span>
                      <span className="mt-1 block truncate text-center text-[10px] text-white/60">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-4 sm:p-8">
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
                          alt={`Current image: ${activeAsset.name}`}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      </div>
                      {showCompare && canCompare ? (
                        <figcaption className="pt-2 text-center text-xs text-white/60">
                          After · {activeAsset.name}
                        </figcaption>
                      ) : null}
                    </figure>
                  ) : null}
                </div>
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
              {downloadUrl ? (
                <Button
                  asChild
                  variant="ghost"
                  className="text-white hover:bg-white/15 hover:text-white"
                >
                  <a href={downloadUrl}>
                    <DownloadIcon /> Download
                  </a>
                </Button>
              ) : null}
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto border-l border-border/60 p-5">
            <div className="mb-5 space-y-1 border-b border-border/60 pb-5">
              <p className="truncate text-sm font-medium">{activeAsset.name}</p>
              <p className="text-xs text-muted-foreground">
                {activeAsset.width && activeAsset.height
                  ? `${activeAsset.width} × ${activeAsset.height} px · `
                  : ""}
                {activeAsset.mimeType.replace("image/", "").toUpperCase()}
              </p>
              {selectedHistoryItem ? (
                <p className="text-xs text-muted-foreground">
                  {selectedHistoryItem.label} is selected as the source for the
                  next edit.
                </p>
              ) : null}
            </div>

            {tool === "edit" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor={`edit-instruction-${activeAsset.id}`}
                    className="text-sm font-medium"
                  >
                    Describe edits
                  </label>
                  <Textarea
                    id={`edit-instruction-${activeAsset.id}`}
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
