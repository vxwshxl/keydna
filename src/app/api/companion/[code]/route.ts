/**
 * Companion relay: the laptop posts session status, the phone reads it and can send "lock".
 * In-memory with a 10-minute TTL — fine for `pnpm dev` on the LAN or a single warm Vercel
 * instance; a multi-instance deployment would need Redis (see README › Companion).
 */
import { z } from "zod";

const Code = z.string().regex(/^[A-Z0-9]{6}$/);
const Status = z.object({
  name: z.string().max(60),
  device: z.string().max(60),
  status: z.enum(["no-profile", "loading", "collecting", "active", "locked", "error"]),
  confidence: z.number().min(0).max(100).nullable(),
  risk: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).nullable(),
  alert: z.boolean(),
  demo: z.boolean(),
});
const Post = z.union([
  z.object({ kind: z.literal("status"), status: Status }),
  z.object({ kind: z.literal("command"), command: z.literal("lock") }),
]);

interface Entry {
  status: z.infer<typeof Status> | null;
  updatedAt: number;
  command: "lock" | null;
}
const g = globalThis as unknown as { __keydnaCompanion?: Map<string, Entry> };
const store = (g.__keydnaCompanion ??= new Map());
const TTL = 10 * 60 * 1000;

function entry(code: string): Entry {
  const now = Date.now();
  for (const [k, v] of store) if (now - v.updatedAt > TTL) store.delete(k);
  let e = store.get(code);
  if (!e) store.set(code, (e = { status: null, updatedAt: now, command: null }));
  return e;
}

export async function GET(_req: Request, ctx: RouteContext<"/api/companion/[code]">) {
  const { code } = await ctx.params;
  if (!Code.safeParse(code).success) return Response.json({ error: "bad code" }, { status: 400 });
  const e = store.get(code);
  return Response.json({ status: e?.status ?? null, updatedAt: e?.updatedAt ?? null });
}

export async function POST(req: Request, ctx: RouteContext<"/api/companion/[code]">) {
  const { code } = await ctx.params;
  if (!Code.safeParse(code).success) return Response.json({ error: "bad code" }, { status: 400 });
  const parsed = Post.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid body" }, { status: 400 });
  const e = entry(code);
  e.updatedAt = Date.now();
  if (parsed.data.kind === "command") {
    e.command = parsed.data.command;
    return Response.json({ ok: true });
  }
  e.status = parsed.data.status;
  const command = e.command;
  e.command = null;
  return Response.json({ ok: true, command });
}
