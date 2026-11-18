# KeyDNA dataset format

Every session, synthetic or collected, is one JSON object in the **`keydna.session.v1`** format.
`ml/keydna/data.py` reads it; `/collect` exports it.

```json
{
  "format": "keydna.session.v1",
  "user_id": "p01",
  "session_id": "p01-s01-3f9a2c",
  "source": "collected",
  "recorded_at": "2026-11-18T14:02:11.000Z",
  "events": [[0.0, 96.4, "L"], [141.2, 233.0, "R"], [262.9, 351.5, "S"]]
}
```

| Field | Meaning |
|---|---|
| `user_id` | Participant ID. Use pseudonyms; no real names are needed. |
| `session_id` | Unique per session. Sessions are ordered by `recorded_at`, then `session_id`. |
| `source` | `demo` (synthetic) or `collected` (real person). |
| `events` | `[down_ms, up_ms, zone]` per keystroke, times relative to the session start. |

**Zones** come from the physical key (`KeyboardEvent.code`), not the character:

| Zone | Keys |
|---|---|
| `L` | Left-hand keys: `` ` 1–5 Tab Q W E R T A S D F G Z X C V B `` |
| `R` | Right-hand keys: `6–0 - = Y U I O P [ ] \ H J K L ; ' N M , . /` |
| `S` | Space |
| `B` | Backspace |
| `E` | Enter |

Modifiers, arrows and function keys are not recorded. Malformed rows (unknown zone, `up < down`) are dropped on load.

A file may contain one session, a JSON array of sessions, or `{"sessions": [...]}`.

## Where files go

| Path | Contents | In git? |
|---|---|---|
| `ml/data/demo/demo_sessions.json` | Synthetic typists from `generate_demo_data.py` (seed 2026) | yes |
| `ml/data/raw/*.json` | Real sessions exported from `/collect` | **no** (personal data, git-ignored) |

## Collection protocol (suggested)

1. 5–10 participants, each giving consent on the `/collect` page.
2. 2–5 sessions per person, ideally on different days, on the same kind of keyboard.
3. 360 keystrokes per session (about a minute). Prompts are drawn from the same sentence pool for everyone.
4. Export → `ml/data/raw/` → `pnpm ml:train --data real`.

The first 320 keystrokes of each person's first session become their enrollment profile. Later sessions are the test probes, and the rest of the first session is discarded to avoid temporal leakage.

## Feature definitions

All features are computed per 60-keystroke window. `hold = up − down`; `flight = down(next) − down(this)`; `ud = down(next) − up(this)`.
Intervals under 600 ms are *fluent*; 600–2000 ms are *pauses*; over 2000 ms is *idle* and is excluded from rhythm statistics and WPM time.

| Feature | Definition |
|---|---|
| `hold_mean/std/median` | Over all keys in the window |
| `flight_mean/std/median/p10/p90` | Over fluent intervals |
| `rhythm_cv` | `flight_std / flight_mean` |
| `ud_mean`, `overlap_rate` | Mean fluent UD latency; share of fluent intervals with UD < 0 (rollover) |
| `pause_rate`, `pause_mean` | Share of intervals that are pauses; their mean length |
| `burst_mean` | Mean number of keys between pauses |
| `wpm` | Non-backspace keys ÷ 5 per minute of non-idle time |
| `backspace_rate` | Share of keys that are backspace |
| `correction_latency` | Mean interval right before the first backspace of a run |
| `backspace_run_mean` | Mean length of consecutive backspace runs |
| `hold_space/left/right_mean` | Mean hold per zone (falls back to `hold_mean`) |
| `flight_cross/same/space_mean` | Fluent L↔R, L→L/R→R, and space↔letter intervals |
| `cross_same_ratio` | `flight_cross_mean / flight_same_mean` |

Percentiles use numpy's default linear interpolation and σ is the population standard deviation; the TypeScript port matches both exactly.
