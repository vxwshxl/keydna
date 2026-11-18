/**
 * POST /api/monkeytype — thin proxy to api.monkeytype.com so the browser can import history.
 * The ApeKey arrives in a header, is forwarded once, and is never stored or logged.
 */
import { z } from "zod";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("list"), limit: z.number().int().min(1).max(1000).default(200) }),
  z.object({ op: z.literal("last") }),
  z.object({ op: z.literal("result"), id: z.string().regex(/^[a-zA-Z0-9_]+$/).max(64) }),
]);

export async function POST(req: Request) {
  const key = req.headers.get("x-ape-key")?.trim();
  if (!key || key.length > 200) return Response.json({ error: "missing ApeKey" }, { status: 400 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid body" }, { status: 400 });
  const b = parsed.data;
  const url =
    b.op === "list"
      ? `https://api.monkeytype.com/results?limit=${b.limit}`
      : b.op === "last"
        ? "https://api.monkeytype.com/results/last"
        : `https://api.monkeytype.com/results/id/${b.id}`;
  const res = await fetch(url, { headers: { Authorization: `ApeKey ${key}` }, cache: "no-store" });
  const body = await res.json().catch(() => ({ message: "Monkeytype returned a non-JSON response" }));
  return Response.json(body, { status: res.status });
}
