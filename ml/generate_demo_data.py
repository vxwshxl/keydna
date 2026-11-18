"""Generate the synthetic DEMO dataset.

    uv run generate_demo_data.py            # 24 training typists + 2 held-out demo typists

Output: data/demo/demo_sessions.json. Every session is tagged source="demo".
The two demo typists ("demo-a", "demo-b") are never used for training or evaluation;
the web app replays them for the no-enrollment security demo.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone

import numpy as np

from keydna.data import DEMO_PATH
from keydna.synth import sample_typist, simulate_session

DEMO_HOLDOUT = ("demo-a", "demo-b")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--users", type=int, default=24)
    ap.add_argument("--sessions", type=int, default=6)
    ap.add_argument("--seed", type=int, default=2026)
    args = ap.parse_args()

    rng = np.random.default_rng(args.seed)
    start = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)
    ids = [f"synth-{i:02d}" for i in range(1, args.users + 1)] + list(DEMO_HOLDOUT)
    sessions = []
    for uid in ids:
        typist = sample_typist(rng, uid)
        for s in range(1, args.sessions + 1):
            sessions.append(
                {
                    "format": "keydna.session.v1",
                    "user_id": uid,
                    "session_id": f"{uid}-s{s:02d}",
                    "source": "demo",
                    "recorded_at": (start + timedelta(days=s)).isoformat(),
                    "events": simulate_session(typist, rng),
                }
            )

    DEMO_PATH.parent.mkdir(parents=True, exist_ok=True)
    DEMO_PATH.write_text(json.dumps({"notice": "SYNTHETIC DEMO DATA — not real human typing", "sessions": sessions}))
    keys = sum(len(s["events"]) for s in sessions)
    print(f"DEMO DATA written to {DEMO_PATH.relative_to(DEMO_PATH.parents[2])}")
    print(f"  typists: {len(ids)} ({len(DEMO_HOLDOUT)} held out for the web demo)")
    print(f"  sessions: {len(sessions)}  keystrokes: {keys:,}")


if __name__ == "__main__":
    main()
