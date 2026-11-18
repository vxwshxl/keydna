"""Synthetic typist simulator — produces DEMO DATA only.

Every session this module writes is tagged `"source": "demo"` and every metric computed from
it is labelled "synthetic demo" in the UI. It exists so the pipeline can be developed and
demonstrated before real people have typed into /collect. It is NOT evidence that keystroke
dynamics work on humans; only real collected sessions are.

Each simulated typist gets a fixed set of behavioural traits (base speed, hold length,
hand-transition habits, pause and error behaviour), and each session applies a small
day-to-day drift on top, so later sessions do not match the enrollment session exactly —
the same problem real continuous authentication has.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

LEFT = set("qwertasdfgzxcvb12345`")
RIGHT = set("yuiophjklnm67890-=[];',./\\")

# Original sentences written for this project (no external corpus).
CORPUS = [
    "the river bends past the old mill before it reaches the quiet town",
    "she packed a map, two apples and a torch for the long night walk",
    "every system should assume the session it trusts might change hands",
    "a careful engineer writes the test before arguing about the result",
    "clouds gathered over the valley while the farmers finished their work",
    "keep the window open so the evening breeze can cool the room",
    "the library closes early on friday but opens again on sunday morning",
    "he tuned the guitar slowly, listening for the moment the strings agreed",
    "small habits repeated every day become the shape of a whole life",
    "the train was late, so we shared stories on the cold platform",
    "measure twice and cut once is still good advice for most projects",
    "bright lanterns lined the street during the festival of lights",
    "the kettle whistled just as the rain began to tap on the roof",
    "learning a new language starts with listening more than speaking",
    "a password proves who logged in, not who is typing right now",
    "the market sold fresh bamboo shoots, ginger and wild honey",
    "our team met at noon to review the plan and assign the tasks",
    "the mountain road was narrow, steep and full of sharp turns",
    "he wrote the letter by hand because it felt more honest that way",
    "data without context can tell a convincing story that is false",
    "the children raced their paper boats along the flooded lane",
    "please save your work often when the power keeps flickering",
    "a quiet morning and a hot cup of tea make any deadline easier",
    "the museum guide explained how the ancient bridge was built",
    "trust is earned slowly and lost in a single careless moment",
    "she practised the song until her fingers knew it without thought",
    "the forest smelled of pine needles and fresh rain after the storm",
    "good security is layered, like the walls of an old fortress",
]


def char_zone(ch: str) -> str:
    if ch == " ":
        return "S"
    c = ch.lower()
    if c in LEFT:
        return "L"
    if c in RIGHT:
        return "R"
    return "R"


@dataclass(frozen=True)
class Typist:
    user_id: str
    base_dd: float  # median fluent inter-key interval, ms
    dd_sigma: float  # log-normal spread of intervals
    hold_mean: float
    hold_sd: float
    left_hold: float  # hand-specific hold offsets, ms
    right_hold: float
    space_hold: float
    cross_factor: float  # cross-hand transitions are usually faster
    same_factor: float
    space_factor: float
    word_start: float  # hesitation at the start of a word
    pause_p: float
    pause_med: float
    err_p: float
    err_lag: int  # keys typed past an error before noticing it
    corr_lat: float  # hesitation before pressing backspace, ms
    bs_dd: float  # backspace repeat interval, ms
    drift: float  # session-to-session variation (log scale)


def sample_typist(rng: np.random.Generator, user_id: str) -> Typist:
    return Typist(
        user_id=user_id,
        base_dd=float(rng.uniform(105, 255)),
        dd_sigma=float(rng.uniform(0.22, 0.48)),
        hold_mean=float(rng.uniform(68, 135)),
        hold_sd=float(rng.uniform(9, 30)),
        left_hold=float(rng.normal(0, 9)),
        right_hold=float(rng.normal(0, 9)),
        space_hold=float(rng.uniform(-12, 38)),
        cross_factor=float(rng.uniform(0.72, 0.97)),
        same_factor=float(rng.uniform(0.98, 1.22)),
        space_factor=float(rng.uniform(0.85, 1.35)),
        word_start=float(rng.uniform(1.0, 1.35)),
        pause_p=float(rng.uniform(0.008, 0.05)),
        pause_med=float(rng.uniform(650, 1500)),
        err_p=float(rng.uniform(0.006, 0.05)),
        err_lag=int(rng.integers(0, 3)),
        corr_lat=float(rng.uniform(140, 480)),
        bs_dd=float(rng.uniform(85, 190)),
        drift=float(rng.uniform(0.03, 0.08)),
    )


def simulate_session(t: Typist, rng: np.random.Generator, min_events: int = 360) -> list[list[float | str]]:
    """Return events as [down_ms, up_ms, zone] rows, matching the session JSON format."""
    speed = float(np.exp(rng.normal(0, t.drift)))  # today's speed
    holdk = float(np.exp(rng.normal(0, t.drift * 0.6)))
    events: list[list[float | str]] = []
    clock = 0.0
    prev_zone = "S"

    def press(zone: str, gap: float) -> None:
        nonlocal clock, prev_zone
        clock += gap
        offset = {"L": t.left_hold, "R": t.right_hold, "S": t.space_hold}.get(zone, 0.0)
        hold = max(22.0, rng.normal(t.hold_mean + offset, t.hold_sd) * holdk)
        events.append([round(clock, 1), round(clock + hold, 1), zone])
        prev_zone = zone

    def fluent_gap(zone: str, word_start: bool) -> float:
        g = t.base_dd * speed * float(np.exp(rng.normal(0, t.dd_sigma)))
        if {prev_zone, zone} == {"L", "R"}:
            g *= t.cross_factor
        elif prev_zone == zone and zone in "LR":
            g *= t.same_factor
        elif "S" in (prev_zone, zone):
            g *= t.space_factor
        if word_start:
            g *= t.word_start
        boundary = word_start or zone == "S"
        if rng.random() < t.pause_p * (2.5 if boundary else 1.0):
            g = t.pause_med * float(np.exp(rng.normal(0, 0.35)))
        return max(18.0, g)

    while len(events) < min_events:
        text = CORPUS[int(rng.integers(len(CORPUS)))] + " "
        i = 0
        while i < len(text):
            zone = char_zone(text[i])
            word_start = i > 0 and text[i - 1] == " "
            if zone != "S" and rng.random() < t.err_p:
                # Mistype, keep going err_lag keys, notice, delete, retype.
                press(rng.choice(["L", "R"]), fluent_gap(zone, word_start))
                extra = text[i + 1 : i + 1 + t.err_lag]
                for ch in extra:
                    press(char_zone(ch), fluent_gap(char_zone(ch), False))
                n_bs = 1 + len(extra)
                press("B", t.corr_lat * float(np.exp(rng.normal(0, 0.3))))
                for _ in range(n_bs - 1):
                    press("B", t.bs_dd * float(np.exp(rng.normal(0, 0.15))))
            press(zone, fluent_gap(zone, word_start))
            i += 1
    return events
