import { type NextRequest } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Tell Next.js this is a dynamic route and give it up to 30 s.
// The Hono API runs all agent tool calls server-side; the proxy just
// forwards the final short NDJSON burst.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteParams = {
  params: Promise<{ workspaceId: string; projectId: string }>;
};

/**
 * Proxy the NDJSON assistant stream directly from the Hono API to the browser.
 *
 * We cannot use the next.config.js rewrite for this endpoint because Next.js
 * rewrites buffer the entire response before forwarding it, which causes
 * ERR_INCOMPLETE_CHUNKED_ENCODING on long-running streams. A Route Handler
 * returns the upstream ReadableStream body unchanged, so the browser receives
 * NDJSON chunks as they arrive.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { workspaceId, projectId } = await params;

  const upstreamUrl = `${API_URL}/api/v1/workspaces/${workspaceId}/projects/${projectId}/assistant/messages/stream`;

  const cookie = request.headers.get("cookie") ?? "";
  const contentType =
    request.headers.get("content-type") ?? "application/json";

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": contentType,
        cookie,
      },
      // @ts-expect-error - Node 18+ / Next.js 14+ require duplex for streaming request bodies
      duplex: "half",
      body: request.body,
    });
  } catch (err) {
    console.error("[stream-proxy] upstream fetch failed", err);
    return new Response(
      JSON.stringify({ error: { message: "Could not reach API server" } }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }

  if (!upstream.ok) {
    // Forward error body as-is (JSON from Hono error handler)
    const errorBody = await upstream.text();
    return new Response(errorBody, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  }

  // Pipe the ReadableStream directly — no buffering.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      "x-content-type-options": "nosniff",
    },
  });
}
