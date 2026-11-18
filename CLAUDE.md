# KeyDNA — project notes

University AI/ML + cybersecurity project: continuous authentication from keystroke dynamics.
Single-app Next.js 16 at the root + uv/Python 3.13 trainer in `ml/`. House standards apply
(`/Users/vee/Web Dev/standards/`), with ADR 012: **light mode only**, Duolingo-style chunky UX
(Nunito + Geist Mono, `.btn3d` / `.card3d` in globals.css). No dark variant, no theme toggle.

## Invariants
- `ml/keydna/features.py` ↔ `src/lib/keydna/features.ts` and `verifier.distances` ↔ `model.ts`
  are one contract. Change both, run `pnpm ml:train`, then `pnpm test` (parity test).
- Never hard-code model numbers in the UI. `/model` reads `public/model/metrics.json`.
- Synthetic data must stay labelled DEMO/preliminary. `ml/data/raw/` is personal data, git-ignored.
- Model output (P(genuine)) vs smoothed confidence (EMA) vs UI risk (thresholds) are kept distinct.
- Replay speed changes delivery timing only, never the timestamps fed to the model.

## Commands
`pnpm dev` · `pnpm test` · `pnpm ml:data` · `pnpm ml:train [--data real]` · `pnpm ml:test`
