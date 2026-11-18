import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertCompatible, type ForestModel } from "./model";

let cached: Promise<ForestModel> | null = null;

/** The same exported forest the browser downloads, read from disk for server inference. */
export function serverModel(): Promise<ForestModel> {
  cached ??= readFile(path.join(process.cwd(), "public/model/keydna-rf.json"), "utf8").then((s) => {
    const m = JSON.parse(s) as ForestModel;
    assertCompatible(m);
    return m;
  });
  return cached;
}

export async function serverMetrics(): Promise<unknown> {
  return JSON.parse(await readFile(path.join(process.cwd(), "public/model/metrics.json"), "utf8"));
}
