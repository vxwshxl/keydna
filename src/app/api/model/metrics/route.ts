/** GET /api/model/metrics — evaluation computed by ml/train.py (never edited by hand). */
import { serverMetrics } from "@/lib/keydna/server-model";

export async function GET() {
  return Response.json(await serverMetrics());
}
