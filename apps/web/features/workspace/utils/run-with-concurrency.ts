/** Max simultaneous presign + S3 PUT + register calls per batch. */
export const WORKSPACE_ASSET_UPLOAD_CONCURRENCY = 4;

export type UploadItemStatus = "queued" | "uploading" | "done" | "error";

export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<Array<PromiseSettledResult<T>>> {
  if (tasks.length === 0) {
    return [];
  }

  const results: Array<PromiseSettledResult<T>> = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= tasks.length) {
        return;
      }

      try {
        const value = await tasks[index]!();
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const workerCount = Math.min(concurrency, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
