/**
 * Gacha prize file upload API
 * - POST /upload: multipart form "file" + optional "kind" (image|audio) -> store in R2, return { url }
 * - GET /u/:key: proxy R2 object (for ZIP fetch and img/audio src)
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ANONYMOUS_ID_LENGTH = 128;
const MAX_PATH_LENGTH = 256;
const MAX_TOOL_ID_LENGTH = 64;
const EVENT_RATE_LIMIT = { max: 120, windowMs: 60_000 };
const UPLOAD_RATE_LIMIT = { max: 30, windowMs: 10 * 60_000 };
const ALLOWED_IMAGE_TYPES = new Set([
	"image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/x-icon",
]);
const ALLOWED_AUDIO_TYPES = new Set([
	"audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/x-m4a", "audio/aac", "audio/webm", "audio/flac",
]);
const ALLOWED_ORIGINS = new Set([
	"https://app-live-counter.vercel.app",
	"https://dango-tool.vercel.app",
	"http://localhost:3000",
	"http://127.0.0.1:3000",
]);
const rateLimitBuckets = new Map<string, number[]>();

function corsHeaders(origin: string | null): HeadersInit {
	const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : ALLOWED_ORIGINS.values().next().value;
	return {
		"Access-Control-Allow-Origin": allowOrigin ?? "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Stats-Secret",
		"Access-Control-Max-Age": "86400",
	};
}

function jsonResponse(body: object, status: number, origin: string | null): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
	});
}

function isAllowedRequestOrigin(origin: string | null): boolean {
	return Boolean(origin && ALLOWED_ORIGINS.has(origin));
}

function clientKey(request: Request, origin: string | null): string {
	const cfConnectingIp = request.headers.get("CF-Connecting-IP");
	const forwardedFor = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
	return cfConnectingIp || forwardedFor || origin || "unknown";
}

function rateLimitAllowed(key: string, max: number, windowMs: number): boolean {
	const now = Date.now();
	const bucket = (rateLimitBuckets.get(key) ?? []).filter((ts) => now - ts < windowMs);
	if (bucket.length >= max) {
		rateLimitBuckets.set(key, bucket);
		return false;
	}
	bucket.push(now);
	rateLimitBuckets.set(key, bucket);

	if (rateLimitBuckets.size > 5000) {
		for (const [bucketKey, timestamps] of rateLimitBuckets.entries()) {
			const recent = timestamps.filter((ts) => now - ts < windowMs);
			if (recent.length === 0) rateLimitBuckets.delete(bucketKey);
			else rateLimitBuckets.set(bucketKey, recent);
		}
	}

	return true;
}

function getExt(name: string, contentType: string): string {
	const fromName = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase().slice(0, 5) : "";
	if (/^\.(png|jpe?g|gif|webp|bmp|ico)$/.test(fromName)) return fromName;
	if (/^\.(mp3|wav|ogg|m4a|aac|webm|flac)$/.test(fromName)) return fromName;
	if (contentType === "image/png") return ".png";
	if (contentType === "image/jpeg" || contentType === "image/jpg") return ".jpg";
	if (contentType === "image/gif") return ".gif";
	if (contentType === "image/webp") return ".webp";
	if (contentType === "audio/mpeg" || contentType === "audio/mp3") return ".mp3";
	if (contentType === "audio/wav") return ".wav";
	if (contentType === "audio/ogg") return ".ogg";
	if (contentType === "audio/x-m4a") return ".m4a";
	if (contentType === "audio/webm") return ".webm";
	if (contentType === "audio/flac") return ".flac";
	return ".bin";
}

function isAllowedType(kind: string | null, contentType: string): boolean {
	if (kind === "image") return ALLOWED_IMAGE_TYPES.has(contentType);
	if (kind === "audio") return ALLOWED_AUDIO_TYPES.has(contentType);
	return ALLOWED_IMAGE_TYPES.has(contentType) || ALLOWED_AUDIO_TYPES.has(contentType);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const origin = request.headers.get("Origin");
		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders(origin) });
		}

		const url = new URL(request.url);

		// GET /u/:key -> proxy R2 object
		if (request.method === "GET" && url.pathname.startsWith("/u/")) {
			const key = url.pathname.slice(3);
			if (key.includes("..") || key.startsWith("/")) {
				return new Response("Bad Request", { status: 400, headers: corsHeaders(origin) });
			}
			const object = await env.BUCKET.get(key);
			if (!object) return new Response("Not Found", { status: 404, headers: corsHeaders(origin) });
			const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
			return new Response(object.body, {
				headers: {
					"Content-Type": contentType,
					"Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; sandbox",
					"X-Content-Type-Options": "nosniff",
					...corsHeaders(origin),
				},
			});
		}

		// POST /api/events — usage analytics (page_view | session_start)
		if (request.method === "POST" && url.pathname === "/api/events") {
			if (!isAllowedRequestOrigin(origin)) {
				return jsonResponse({ error: "Forbidden origin" }, 403, origin);
			}
			if (!rateLimitAllowed(`events:${clientKey(request, origin)}`, EVENT_RATE_LIMIT.max, EVENT_RATE_LIMIT.windowMs)) {
				return jsonResponse({ error: "Too many requests" }, 429, origin);
			}
			try {
				const body = (await request.json()) as { anonymousId?: string; path?: string; toolId?: string; eventType?: string };
				const anonymousId = typeof body.anonymousId === "string" ? body.anonymousId.trim() : "";
				const path = typeof body.path === "string" ? body.path.trim() : "";
				const toolId = typeof body.toolId === "string" ? body.toolId.trim() : "";
				const eventType = typeof body.eventType === "string" && (body.eventType === "page_view" || body.eventType === "session_start")
					? body.eventType
					: "page_view";
				if (!anonymousId || !path) {
					return jsonResponse({ error: "anonymousId and path required" }, 400, origin);
				}
				if (
					anonymousId.length > MAX_ANONYMOUS_ID_LENGTH ||
					path.length > MAX_PATH_LENGTH ||
					toolId.length > MAX_TOOL_ID_LENGTH ||
					!path.startsWith("/")
				) {
					return jsonResponse({ error: "Invalid analytics payload" }, 400, origin);
				}
				const ts = new Date().toISOString();
				await env.DB.prepare(
					"INSERT INTO usage_events (ts, anonymous_id, path, tool_id, event_type) VALUES (?, ?, ?, ?, ?)"
				)
					.bind(ts, anonymousId, path, toolId, eventType)
					.run();
				return jsonResponse({ ok: true }, 200, origin);
			} catch (e) {
				console.error(e);
				return jsonResponse({ error: "Failed to record event" }, 500, origin);
			}
		}

		// GET /api/stats — aggregated usage (protected by X-Stats-Secret or Authorization)
		if (request.method === "GET" && url.pathname === "/api/stats") {
			const secret = env.STATS_SECRET ?? "";
			const authHeader = request.headers.get("Authorization");
			const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
			const headerSecret = request.headers.get("X-Stats-Secret") ?? "";
			if (!secret || (bearer !== secret && headerSecret !== secret)) {
				return jsonResponse({ error: "Unauthorized" }, 401, origin);
			}
			try {
				const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") ?? "30", 10)));
				const bindDays = `-${days} days`;
				// 管理画面は集計から除外（path NOT LIKE '/admin%'）
				const notAdmin = " AND path NOT LIKE '/admin%'";
				// ページビュー: event_type が page_view または NULL（既存データ互換）
				const byTool = await env.DB.prepare(
					`SELECT tool_id, COUNT(*) as views, COUNT(DISTINCT anonymous_id) as users
					 FROM usage_events
					 WHERE ts >= date('now', ?) AND (event_type IS NULL OR event_type = 'page_view')${notAdmin}
					 GROUP BY tool_id
					 ORDER BY views DESC`
				)
					.bind(bindDays)
					.all();
				const byDayViews = await env.DB.prepare(
					`SELECT date(ts) as day, COUNT(*) as views, COUNT(DISTINCT anonymous_id) as users
					 FROM usage_events
					 WHERE ts >= date('now', ?) AND (event_type IS NULL OR event_type = 'page_view')${notAdmin}
					 GROUP BY day
					 ORDER BY day DESC
					 LIMIT 90`
				)
					.bind(bindDays)
					.all();
				const byDaySessions = await env.DB.prepare(
					`SELECT date(ts) as day, COUNT(*) as sessions
					 FROM usage_events
					 WHERE ts >= date('now', ?) AND event_type = 'session_start'${notAdmin}
					 GROUP BY day
					 ORDER BY day DESC
					 LIMIT 90`
				)
					.bind(bindDays)
					.all();
				const sessionsResult = await env.DB.prepare(
					`SELECT COUNT(*) as total FROM usage_events WHERE ts >= date('now', ?) AND event_type = 'session_start'${notAdmin}`
				)
					.bind(bindDays)
					.all();
				const totalSessions = (sessionsResult.results?.[0] as { total?: number } | undefined)?.total ?? 0;
				const sessionRows = (byDaySessions.results ?? []) as Array<{ day: string; sessions: number }>;
				const viewRows = (byDayViews.results ?? []) as Array<{ day: string; views: number; users: number }>;
				const sessionMap = new Map<string, number>(sessionRows.map((r) => [r.day, r.sessions]));
				const byDay = viewRows.map((r) => ({
					day: r.day,
					views: r.views,
					users: r.users,
					sessions: sessionMap.get(r.day) ?? 0,
				}));
				return jsonResponse(
					{
						byTool: byTool.results ?? [],
						byDay: byDay.slice(0, days),
						days,
						totalSessions,
					},
					200,
					origin
				);
			} catch (e) {
				console.error(e);
				return jsonResponse({ error: "Failed to fetch stats" }, 500, origin);
			}
		}

		// GET /api/stats/visitors — list visitors (anonymous_id) with counts (same auth as /api/stats)
		if (request.method === "GET" && url.pathname === "/api/stats/visitors") {
			const secret = env.STATS_SECRET ?? "";
			const authHeader = request.headers.get("Authorization");
			const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
			const headerSecret = request.headers.get("X-Stats-Secret") ?? "";
			if (!secret || (bearer !== secret && headerSecret !== secret)) {
				return jsonResponse({ error: "Unauthorized" }, 401, origin);
			}
			try {
				const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") ?? "30", 10)));
				const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10)));
				const visitors = await env.DB.prepare(
					`SELECT anonymous_id, COUNT(*) as views, MIN(ts) as first_ts, MAX(ts) as last_ts, GROUP_CONCAT(DISTINCT tool_id) as tool_ids
					 FROM usage_events
					 WHERE ts >= date('now', ?) AND path NOT LIKE '/admin%'
					 GROUP BY anonymous_id
					 ORDER BY views DESC
					 LIMIT ?`
				)
					.bind(`-${days} days`, limit)
					.all();
				return jsonResponse(
					{ visitors: visitors.results ?? [], days, limit },
					200,
					origin
				);
			} catch (e) {
				console.error(e);
				return jsonResponse({ error: "Failed to fetch visitors" }, 500, origin);
			}
		}

		// GET /api/stats/visitor/:id — events for one anonymous_id (same auth as /api/stats)
		if (request.method === "GET" && url.pathname.startsWith("/api/stats/visitor/") && url.pathname.length > "/api/stats/visitor/".length) {
			const secret = env.STATS_SECRET ?? "";
			const authHeader = request.headers.get("Authorization");
			const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
			const headerSecret = request.headers.get("X-Stats-Secret") ?? "";
			if (!secret || (bearer !== secret && headerSecret !== secret)) {
				return jsonResponse({ error: "Unauthorized" }, 401, origin);
			}
			const anonymousId = decodeURIComponent(url.pathname.slice("/api/stats/visitor/".length));
			if (!anonymousId) {
				return jsonResponse({ error: "Missing visitor id" }, 400, origin);
			}
			try {
				const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days") ?? "30", 10)));
				const events = await env.DB.prepare(
					`SELECT ts, path, tool_id FROM usage_events WHERE anonymous_id = ? AND ts >= date('now', ?) AND path NOT LIKE '/admin%' ORDER BY ts DESC LIMIT 500`
				)
					.bind(anonymousId, `-${days} days`)
					.all();
				return jsonResponse(
					{ anonymousId, events: events.results ?? [], days },
					200,
					origin
				);
			} catch (e) {
				console.error(e);
				return jsonResponse({ error: "Failed to fetch visitor events" }, 500, origin);
			}
		}

		// POST /upload
		if (request.method === "POST" && url.pathname === "/upload") {
			if (!isAllowedRequestOrigin(origin)) {
				return jsonResponse({ error: "Forbidden origin" }, 403, origin);
			}
			if (!rateLimitAllowed(`upload:${clientKey(request, origin)}`, UPLOAD_RATE_LIMIT.max, UPLOAD_RATE_LIMIT.windowMs)) {
				return jsonResponse({ error: "Too many requests" }, 429, origin);
			}
			try {
				const contentType = request.headers.get("Content-Type") ?? "";
				if (!contentType.includes("multipart/form-data")) {
					return jsonResponse({ error: "Content-Type must be multipart/form-data" }, 400, origin);
				}
				const formData = await request.formData();
				const file = formData.get("file");
				const kind = formData.get("kind")?.toString() ?? null;
				if (!file || typeof file === "string") {
					return jsonResponse({ error: "Missing file field" }, 400, origin);
				}
				const f = file as File;
				if (f.size < 1 || f.size > MAX_FILE_SIZE) {
					return jsonResponse({ error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, 400, origin);
				}
				const type = f.type || "application/octet-stream";
				if (!isAllowedType(kind, type)) {
					return jsonResponse({ error: "Disallowed file type" }, 400, origin);
				}
				const ext = getExt(f.name, type);
				const key = `uploads/${crypto.randomUUID()}${ext}`;
				await env.BUCKET.put(key, f.stream(), {
					httpMetadata: { contentType: type },
				});
				const baseUrl = url.origin;
				return jsonResponse({ url: `${baseUrl}/u/${key}` }, 200, origin);
			} catch (e) {
				console.error(e);
				return jsonResponse({ error: "Upload failed" }, 500, origin);
			}
		}

		// Legacy routes for compatibility
		if (url.pathname === "/message") return new Response("Hello, World!", { headers: corsHeaders(origin) });
		if (url.pathname === "/random") return new Response(crypto.randomUUID(), { headers: corsHeaders(origin) });

		return new Response("Not Found", { status: 404, headers: corsHeaders(origin) });
	},
} satisfies ExportedHandler<Env>;
