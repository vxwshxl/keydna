"""Keystroke-dynamics feature extraction.

This module is the contract for the whole system. `src/lib/keydna/features.ts` is a
line-for-line port, and `tests/test_parity_fixture.py` + the vitest parity test prove that
both produce identical numbers. Change one, change the other, regenerate the fixture.

Raw input is a list of keystroke events, each `(down_ms, up_ms, zone)`:

    zone  meaning                         why only the zone is kept
    ----  ------------------------------  --------------------------------------------
    "L"   key typed by the left hand      the model needs *which hand*, not *which
    "R"   key typed by the right hand     letter* — so the text you typed is never
    "S"   space bar (thumb)               stored, only its timing and hand pattern
    "B"   backspace
    "E"   enter

Timing vocabulary used below:
    hold    = up - down of one key                        (a.k.a. dwell time)
    flight  = down(next) - down(this)                     (a.k.a. DD latency)
    ud      = down(next) - up(this); negative = rollover  (a.k.a. UD latency)
"""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np

Event = tuple[float, float, str]

WINDOW_SIZE = 60  # keystrokes per prediction window
WINDOW_STRIDE = 20  # slide used to cut training / enrollment windows
PAUSE_MS = 600.0  # an interval this long breaks a typing burst
IDLE_MS = 2000.0  # longer than this = the person stopped typing; excluded from rhythm

FEATURE_NAMES: list[str] = [
    "hold_mean",
    "hold_std",
    "hold_median",
    "flight_mean",
    "flight_std",
    "flight_median",
    "flight_p10",
    "flight_p90",
    "rhythm_cv",
    "ud_mean",
    "overlap_rate",
    "pause_rate",
    "pause_mean",
    "burst_mean",
    "wpm",
    "backspace_rate",
    "correction_latency",
    "backspace_run_mean",
    "hold_space_mean",
    "hold_left_mean",
    "hold_right_mean",
    "flight_cross_mean",
    "flight_same_mean",
    "flight_space_mean",
    "cross_same_ratio",
]

FEATURE_LABELS: dict[str, str] = {
    "hold_mean": "Key hold duration (mean)",
    "hold_std": "Key hold variability",
    "hold_median": "Key hold duration (median)",
    "flight_mean": "Inter-key interval (mean)",
    "flight_std": "Inter-key interval variability",
    "flight_median": "Inter-key interval (median)",
    "flight_p10": "Fastest transitions (p10)",
    "flight_p90": "Slowest fluent transitions (p90)",
    "rhythm_cv": "Rhythm irregularity (CV)",
    "ud_mean": "Release-to-press gap",
    "overlap_rate": "Key rollover rate",
    "pause_rate": "Pause frequency",
    "pause_mean": "Pause duration",
    "burst_mean": "Burst length",
    "wpm": "Typing speed (WPM)",
    "backspace_rate": "Backspace frequency",
    "correction_latency": "Correction latency",
    "backspace_run_mean": "Backspace run length",
    "hold_space_mean": "Space bar hold",
    "hold_left_mean": "Left-hand hold",
    "hold_right_mean": "Right-hand hold",
    "flight_cross_mean": "Cross-hand transition",
    "flight_same_mean": "Same-hand transition",
    "flight_space_mean": "Word-boundary transition",
    "cross_same_ratio": "Cross / same-hand ratio",
}

# Smallest spread treated as "normal variation" per feature, in the feature's own units.
# Without it, a trait that happened not to vary during enrollment (e.g. zero backspaces)
# would turn any later occurrence into a maximal deviation. Values were picked by a sweep
# over leave-users-out CV on the synthetic set (0.25x of a first guess: best false-alarm
# rate at equal EER) — re-check them once real data is collected.
_TIMING = (
    "hold_mean", "hold_median", "flight_mean", "flight_median", "flight_p10", "flight_p90",
    "ud_mean", "hold_space_mean", "hold_left_mean", "hold_right_mean", "flight_cross_mean",
    "flight_same_mean", "flight_space_mean", "hold_std", "flight_std",
)
STD_FLOOR: dict[str, float] = {
    **{n: 2.5 for n in _TIMING},  # ms
    "pause_mean": 25.0,
    "correction_latency": 15.0,
    "rhythm_cv": 0.0125,
    "cross_same_ratio": 0.0125,
    "overlap_rate": 0.0075,
    "pause_rate": 0.005,
    "backspace_rate": 0.005,
    "burst_mean": 0.25,
    "backspace_run_mean": 0.125,
    "wpm": 0.75,
}

# Coarse groups for the explainability chart ("which *kind* of behaviour mattered").
FEATURE_GROUPS: dict[str, str] = {
    "hold_mean": "Key hold duration",
    "hold_std": "Timing variability",
    "hold_median": "Key hold duration",
    "flight_mean": "Inter-key interval",
    "flight_std": "Timing variability",
    "flight_median": "Inter-key interval",
    "flight_p10": "Inter-key interval",
    "flight_p90": "Inter-key interval",
    "rhythm_cv": "Rhythm consistency",
    "ud_mean": "Key overlap",
    "overlap_rate": "Key overlap",
    "pause_rate": "Pauses & bursts",
    "pause_mean": "Pauses & bursts",
    "burst_mean": "Pauses & bursts",
    "wpm": "WPM",
    "backspace_rate": "Correction pattern",
    "correction_latency": "Correction pattern",
    "backspace_run_mean": "Correction pattern",
    "hold_space_mean": "Key hold duration",
    "hold_left_mean": "Key hold duration",
    "hold_right_mean": "Key hold duration",
    "flight_cross_mean": "Hand transitions",
    "flight_same_mean": "Hand transitions",
    "flight_space_mean": "Hand transitions",
    "cross_same_ratio": "Hand transitions",
}


def _mean(values: np.ndarray, fallback: float) -> float:
    return float(values.mean()) if values.size else fallback


def window_features(events: Sequence[Event]) -> np.ndarray:
    """25 behavioural features for one window of keystrokes (sorted by key-down time)."""
    if len(events) < 3:
        raise ValueError("a window needs at least 3 keystrokes")

    down = np.array([e[0] for e in events], dtype=np.float64)
    up = np.array([e[1] for e in events], dtype=np.float64)
    zone = [e[2] for e in events]
    n = len(events)

    hold = up - down
    dd = down[1:] - down[:-1]
    ud = down[1:] - up[:-1]

    fluent = dd < PAUSE_MS
    pause = (dd >= PAUSE_MS) & (dd < IDLE_MS)

    fl = dd[fluent]
    if fl.size == 0:
        fl = np.array([0.0])

    hold_mean = float(hold.mean())
    flight_mean = float(fl.mean())
    flight_std = float(fl.std())

    # Bursts: runs of keys separated by pauses (or idle gaps).
    breaks = np.flatnonzero(dd >= PAUSE_MS)
    edges = np.concatenate(([-1], breaks, [n - 1]))
    burst_mean = float(np.diff(edges).mean())

    is_bs = np.array([z == "B" for z in zone])
    typed = int((~is_bs).sum())
    active_ms = float(dd[dd < IDLE_MS].sum())
    wpm = (typed / 5.0) / (active_ms / 60000.0) if active_ms > 0 else 0.0

    corr: list[float] = []
    runs: list[int] = []
    run = 0
    for i in range(n):
        if is_bs[i]:
            if run == 0 and i > 0 and dd[i - 1] < IDLE_MS:
                corr.append(float(dd[i - 1]))
            run += 1
        else:
            if run:
                runs.append(run)
            run = 0
    if run:
        runs.append(run)

    def zone_hold(z: str) -> float:
        return _mean(np.array([hold[i] for i in range(n) if zone[i] == z]), hold_mean)

    cross: list[float] = []
    same: list[float] = []
    space: list[float] = []
    for i in range(n - 1):
        if not fluent[i]:
            continue
        a, b = zone[i], zone[i + 1]
        if (a, b) in (("L", "R"), ("R", "L")):
            cross.append(float(dd[i]))
        elif (a, b) in (("L", "L"), ("R", "R")):
            same.append(float(dd[i]))
        elif (a == "S" and b in "LR") or (b == "S" and a in "LR"):
            space.append(float(dd[i]))

    cross_mean = _mean(np.array(cross), flight_mean)
    same_mean = _mean(np.array(same), flight_mean)
    fluent_ud = ud[fluent]

    return np.array(
        [
            hold_mean,
            float(hold.std()),
            float(np.percentile(hold, 50)),
            flight_mean,
            flight_std,
            float(np.percentile(fl, 50)),
            float(np.percentile(fl, 10)),
            float(np.percentile(fl, 90)),
            flight_std / flight_mean if flight_mean > 0 else 0.0,
            _mean(fluent_ud, 0.0),
            float((fluent_ud < 0).mean()) if fluent_ud.size else 0.0,
            float(pause.mean()),
            _mean(dd[pause], 0.0),
            burst_mean,
            wpm,
            float(is_bs.mean()),
            _mean(np.array(corr), 0.0),
            _mean(np.array(runs, dtype=np.float64), 0.0),
            zone_hold("S"),
            zone_hold("L"),
            zone_hold("R"),
            cross_mean,
            same_mean,
            _mean(np.array(space), flight_mean),
            cross_mean / same_mean if same_mean > 0 else 1.0,
        ],
        dtype=np.float64,
    )


def windows(events: Sequence[Event], size: int = WINDOW_SIZE, stride: int = WINDOW_STRIDE) -> list[Sequence[Event]]:
    """Cut a session into overlapping windows. Never mixes two sessions."""
    return [events[s : s + size] for s in range(0, len(events) - size + 1, stride)]


def session_feature_matrix(events: Sequence[Event], size: int = WINDOW_SIZE, stride: int = WINDOW_STRIDE) -> np.ndarray:
    ws = windows(events, size, stride)
    if not ws:
        return np.empty((0, len(FEATURE_NAMES)))
    return np.vstack([window_features(w) for w in ws])
