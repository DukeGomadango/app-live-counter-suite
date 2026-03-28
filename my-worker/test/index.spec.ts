import { env, createExecutionContext, waitOnExecutionContext, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src";

const ALLOWED_ORIGIN = "https://dango-tool.vercel.app";
const STATS_SECRET = "vitest-stats-secret";

function request(path: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers);
  if (!headers.has("Origin")) {
    headers.set("Origin", ALLOWED_ORIGIN);
  }
  return new Request(`http://example.com${path}`, {
    ...init,
    headers,
  });
}

describe("legacy routes", () => {
  it("/message returns Hello, World!", async () => {
    const r = await SELF.fetch(request("/message"));
    expect(await r.text()).toBe("Hello, World!");
  });

  it("/random returns UUID", async () => {
    const r = await SELF.fetch(request("/random"));
    expect(await r.text()).toMatch(/^[a-f0-9-]{36}$/);
  });
});

describe("CORS", () => {
  it("OPTIONS returns 204 with ACAO", async () => {
    const r = await SELF.fetch(
      request("/", {
        method: "OPTIONS",
        headers: { "Access-Control-Request-Method": "POST" },
      }),
    );
    expect(r.status).toBe(204);
    expect(r.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
  });
});

describe("POST /api/events", () => {
  it("400 when anonymousId missing", async () => {
    const ctx = createExecutionContext();
    const r = await worker.fetch(
      request("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/counter" }),
      }),
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(r.status).toBe(400);
    const j = (await r.json()) as { error?: string };
    expect(j.error).toBeDefined();
  });

  it("400 when path missing", async () => {
    const ctx = createExecutionContext();
    const r = await worker.fetch(
      request("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymousId: "anon-test-1" }),
      }),
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(r.status).toBe(400);
  });

  it("200 and stores row", async () => {
    const ctx = createExecutionContext();
    const id = crypto.randomUUID();
    const r = await worker.fetch(
      request("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousId: id,
          path: "/counter",
          toolId: "counter",
          eventType: "page_view",
        }),
      }),
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(r.status).toBe(200);
    const j = (await r.json()) as { ok?: boolean };
    expect(j.ok).toBe(true);

    const q = await env.DB.prepare("SELECT COUNT(*) as c FROM usage_events WHERE anonymous_id = ?").bind(id).first<{ c: number }>();
    expect(q?.c).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /api/stats", () => {
  it("401 without secret", async () => {
    const r = await SELF.fetch(request("/api/stats"));
    expect(r.status).toBe(401);
  });

  it("200 with X-Stats-Secret", async () => {
    const r = await SELF.fetch(
      request("/api/stats?days=7", {
        headers: { "X-Stats-Secret": STATS_SECRET },
      }),
    );
    expect(r.status).toBe(200);
    const j = (await r.json()) as { byTool?: unknown[]; byDay?: unknown[]; days?: number };
    expect(Array.isArray(j.byTool)).toBe(true);
    expect(Array.isArray(j.byDay)).toBe(true);
    expect(j.days).toBe(7);
  });

  it("clamps days to 1..90", async () => {
    const r = await SELF.fetch(
      request("/api/stats?days=999", {
        headers: { "X-Stats-Secret": STATS_SECRET },
      }),
    );
    expect(r.status).toBe(200);
    const j = (await r.json()) as { days?: number };
    expect(j.days).toBe(90);
  });
});

describe("GET /api/stats/visitors", () => {
  it("401 without secret", async () => {
    const r = await SELF.fetch(request("/api/stats/visitors"));
    expect(r.status).toBe(401);
  });

  it("200 with Bearer secret", async () => {
    const r = await SELF.fetch(
      request("/api/stats/visitors?limit=5", {
        headers: { Authorization: `Bearer ${STATS_SECRET}` },
      }),
    );
    expect(r.status).toBe(200);
    const j = (await r.json()) as { visitors?: unknown[] };
    expect(Array.isArray(j.visitors)).toBe(true);
  });
});

describe("GET /api/stats/visitor/:id", () => {
  it("401 without secret", async () => {
    const r = await SELF.fetch(request("/api/stats/visitor/foo"));
    expect(r.status).toBe(401);
  });

  it("200 for known anonymous id after event", async () => {
    const ctx = createExecutionContext();
    const id = crypto.randomUUID();
    await worker.fetch(
      request("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymousId: id, path: "/slot", toolId: "slot" }),
      }),
      env,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    const r = await SELF.fetch(
      request(`/api/stats/visitor/${encodeURIComponent(id)}`, {
        headers: { "X-Stats-Secret": STATS_SECRET },
      }),
    );
    expect(r.status).toBe(200);
    const j = (await r.json()) as { events?: unknown[]; anonymousId?: string };
    expect(j.anonymousId).toBe(id);
    expect(Array.isArray(j.events)).toBe(true);
    expect(j.events!.length).toBeGreaterThanOrEqual(1);
  });
});

describe("POST /upload", () => {
  it("400 when Content-Type is not multipart", async () => {
    const r = await SELF.fetch(
      request("/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    expect(r.status).toBe(400);
  });

  it("400 when file field missing", async () => {
    const form = new FormData();
    const r = await SELF.fetch(
      request("/upload", {
        method: "POST",
        body: form,
      }),
    );
    expect(r.status).toBe(400);
  });

  it("200 stores PNG and GET /u/ returns bytes", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "t.png", { type: "image/png" }));
    const up = await SELF.fetch(
      request("/upload", {
        method: "POST",
        body: form,
      }),
    );
    expect(up.status).toBe(200);
    const j = (await up.json()) as { url?: string };
    expect(j.url).toMatch(/\/u\/uploads\//);

    const pathOnly = new URL(j.url!).pathname;
    const getRes = await SELF.fetch(request(pathOnly));
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Content-Type")).toContain("image");
  });

  it("400 for disallowed mime", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "x.exe", { type: "application/octet-stream" }));
    const r = await SELF.fetch(
      request("/upload", {
        method: "POST",
        body: form,
      }),
    );
    expect(r.status).toBe(400);
  });
});

describe("GET /u/", () => {
  it("404 for missing object", async () => {
    const r = await SELF.fetch(request("/u/uploads/00000000-0000-4000-8000-000000000000.png"));
    expect(r.status).toBe(404);
  });

  it("400 for path traversal", async () => {
    const r = await SELF.fetch(request("/u/uploads/../secret"));
    expect(r.status).toBe(400);
  });
});

describe("unknown route", () => {
  it("404", async () => {
    const r = await SELF.fetch(request("/nope"));
    expect(r.status).toBe(404);
  });
});
