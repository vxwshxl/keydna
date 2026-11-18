/**
 * POST /api/predict — server-side scoring for "server inference" mode.
 * Receives a derived feature vector and the profile's mean/σ. Never keystrokes, never text.
 */
import { z } from "zod";
import { FEATURE_NAMES } from "@/lib/keydna/features";
import { distances, predictProba } from "@/lib/keydna/model";
import { serverModel } from "@/lib/keydna/server-model";

const vec = z.array(z.number().finite()).length(FEATURE_NAMES.length);
const Body = z.object({
  features: vec,
  profile: z.object({ mean: vec, std: vec.refine((a) => a.every((v) => v >= 0)), n_windows: z.number().int().min(2) }),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid body", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  const model = await serverModel();
  const d = distances(parsed.data.features, parsed.data.profile, model.config);
  return Response.json({ proba: predictProba(model, d), distances: d, model_version: model.model_version });
}
