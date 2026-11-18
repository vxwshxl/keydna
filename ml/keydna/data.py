"""Session dataset loading. Format documented in docs/DATASET.md."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .features import Event

ML_DIR = Path(__file__).resolve().parents[1]
DEMO_PATH = ML_DIR / "data" / "demo" / "demo_sessions.json"
RAW_DIR = ML_DIR / "data" / "raw"
VALID_ZONES = {"L", "R", "S", "B", "E"}


@dataclass
class Session:
    user_id: str
    session_id: str
    source: str  # "demo" | "collected"
    recorded_at: str
    events: list[Event]


def _parse(obj: dict, fallback_source: str) -> Session:
    if obj.get("format") != "keydna.session.v1":
        raise ValueError(f"unsupported session format: {obj.get('format')!r}")
    events: list[Event] = []
    for row in obj["events"]:
        down, up, zone = float(row[0]), float(row[1]), str(row[2])
        if zone not in VALID_ZONES or up < down:
            continue  # drop malformed rows rather than poisoning a window
        events.append((down, up, zone))
    events.sort(key=lambda e: e[0])
    return Session(
        user_id=str(obj["user_id"]),
        session_id=str(obj["session_id"]),
        source=str(obj.get("source", fallback_source)),
        recorded_at=str(obj.get("recorded_at", "")),
        events=events,
    )


def load_file(path: Path, fallback_source: str) -> list[Session]:
    data = json.loads(path.read_text())
    items = data if isinstance(data, list) else data.get("sessions", [data])
    return [_parse(o, fallback_source) for o in items]


def load_demo() -> list[Session]:
    return load_file(DEMO_PATH, "demo")


def load_raw() -> list[Session]:
    sessions: list[Session] = []
    for p in sorted(RAW_DIR.glob("*.json")):
        sessions.extend(load_file(p, "collected"))
    return sessions


def by_user(sessions: list[Session]) -> dict[str, list[Session]]:
    out: dict[str, list[Session]] = {}
    for s in sessions:
        out.setdefault(s.user_id, []).append(s)
    for v in out.values():
        v.sort(key=lambda s: (s.recorded_at, s.session_id))
    return out
