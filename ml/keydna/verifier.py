"""Enrollment profiles, verification pairs and evaluation.

The model is a *verifier*, not an identifier. It never learns "this is Alex". It learns
"does this window of typing look like it came from the person this profile was built from?"
Its input is a distance vector between a live window and an enrolled profile:

    d_f = min( |x_f - mean_f| / max(std_f, REL_FLOOR*|mean_f|, FLOOR_f), D_CAP )

computed for each of the 25 features. Because it learns what genuine-vs-impostor *distances*
look like, a model trained on other people works for a brand-new user the moment they
enroll — which is exactly the continuous-authentication setting.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GroupKFold

from .data import Session
from .features import FEATURE_NAMES, STD_FLOOR, WINDOW_SIZE, WINDOW_STRIDE, Event, session_feature_matrix

ENROLL_KEYS = 320  # keystrokes needed to enroll (≈ 45–60 s of typing)
ENROLL_STRIDE = 10  # denser windows during enrollment → steadier mean/std
LIVE_STRIDE = 15  # how often the dashboard re-scores while you type
REL_FLOOR = 0.05
ABS_FLOOR = np.array([STD_FLOOR[n] for n in FEATURE_NAMES])  # per-feature, in feature units
D_CAP = 10.0
EMA_ALPHA = 0.35  # smoothing for displayed confidence (also used by the web app)
RF_PARAMS = dict(
    n_estimators=100,
    max_depth=10,
    min_samples_leaf=4,
    max_features="sqrt",
    class_weight="balanced",
    random_state=7,
    n_jobs=-1,
)


@dataclass
class Profile:
    mean: np.ndarray
    std: np.ndarray
    n_windows: int


def profile_from_matrix(F: np.ndarray) -> Profile:
    if F.shape[0] < 2:
        raise ValueError("need at least 2 enrollment windows")
    return Profile(mean=F.mean(axis=0), std=F.std(axis=0), n_windows=int(F.shape[0]))


def distances(F: np.ndarray, p: Profile) -> np.ndarray:
    sd = np.maximum(np.maximum(p.std, REL_FLOOR * np.abs(p.mean)), ABS_FLOOR)
    return np.minimum(np.abs(F - p.mean) / sd, D_CAP)


def split_enrollment(sessions: list[Session]) -> tuple[list[Event], list[Session]]:
    """First ENROLL_KEYS keystrokes (chronologically) enroll; later sessions are probes.

    The remainder of the session that finished enrollment is discarded, so no probe window
    is ever adjacent in time to an enrollment window (that would leak and flatter results).
    """
    enroll: list[Event] = []
    used = 0
    for i, s in enumerate(sessions):
        need = ENROLL_KEYS - len(enroll)
        enroll.extend(s.events[:need])
        used = i + 1
        if len(enroll) >= ENROLL_KEYS:
            break
    return enroll, sessions[used:]


@dataclass
class UserData:
    user_id: str
    profile: Profile
    probes: list[np.ndarray]  # one feature matrix per probe session


def prepare_users(grouped: dict[str, list[Session]]) -> dict[str, UserData]:
    out: dict[str, UserData] = {}
    for uid, sessions in grouped.items():
        enroll, probe_sessions = split_enrollment(sessions)
        if len(enroll) < ENROLL_KEYS or not probe_sessions:
            continue  # cannot both enroll and test this person
        prof = profile_from_matrix(session_feature_matrix(enroll, WINDOW_SIZE, ENROLL_STRIDE))
        probes = [m for s in probe_sessions if (m := session_feature_matrix(s.events)).shape[0]]
        if probes:
            out[uid] = UserData(uid, prof, probes)
    return out


def build_pairs(users: dict[str, UserData], ids: list[str], rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """Genuine pairs (own probes vs own profile) + an equal number of impostor pairs."""
    X: list[np.ndarray] = []
    y: list[np.ndarray] = []
    for uid in ids:
        u = users[uid]
        genuine = np.vstack(u.probes)
        others = [w for oid in ids if oid != uid for w in users[oid].probes]
        if not others:
            continue
        pool = np.vstack(others)
        pick = rng.choice(pool.shape[0], size=min(genuine.shape[0], pool.shape[0]), replace=False)
        X += [distances(genuine, u.profile), distances(pool[pick], u.profile)]
        y += [np.ones(genuine.shape[0]), np.zeros(pick.size)]
    return np.vstack(X), np.concatenate(y)


def eer(y: np.ndarray, score: np.ndarray) -> tuple[float, float]:
    """Equal error rate and the threshold where FAR == FRR (linear interpolation)."""
    fpr, tpr, thr = roc_curve(y, score)
    frr = 1 - tpr
    i = int(np.argmin(np.abs(fpr - frr)))
    if i > 0 and (fpr[i] - frr[i]) * (fpr[i - 1] - frr[i - 1]) < 0:
        a, b = fpr[i - 1] - frr[i - 1], fpr[i] - frr[i]
        w = a / (a - b)
        rate = fpr[i - 1] + w * (fpr[i] - fpr[i - 1])
        t = thr[i - 1] + w * (thr[i] - thr[i - 1])
        return float(rate), float(min(t, 1.0))
    return float((fpr[i] + frr[i]) / 2), float(min(thr[i], 1.0))


def roc_points(y: np.ndarray, score: np.ndarray, n: int = 60) -> list[dict]:
    fpr, tpr, thr = roc_curve(y, score)
    idx = np.unique(np.linspace(0, len(fpr) - 1, n).round().astype(int))
    return [
        {"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4), "threshold": round(float(min(thr[i], 1e6)), 4)}
        for i in idx
    ]


def classification_report(y: np.ndarray, proba: np.ndarray, threshold: float) -> dict:
    pred = (proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    p, r, f, _ = precision_recall_fscore_support(y, pred, average="binary", zero_division=0)
    return {
        "threshold": threshold,
        "accuracy": float(accuracy_score(y, pred)),
        "precision": float(p),
        "recall": float(r),
        "f1": float(f),
        "far": float(fp / (fp + tn)) if fp + tn else 0.0,
        "frr": float(fn / (fn + tp)) if fn + tp else 0.0,
        "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def continuous_simulation(model: RandomForestClassifier, users: dict[str, UserData], ids: list[str], critical: float) -> dict:
    """Replay whole probe sessions window-by-window through EMA smoothing, like the dashboard.

    Impostor runs start from a verified state (EMA = 1.0) — the attacker sits down at an
    unlocked session. Reports how often and how fast the smoothed score crosses `critical`.
    """
    keys_to_detect: list[int] = []
    impostor_runs = detected = genuine_runs = false_alarms = 0
    for uid in ids:
        u = users[uid]
        for oid in ids:
            for m in users[oid].probes:
                proba = model.predict_proba(distances(m, u.profile))[:, 1]
                ema, hit = 1.0, None
                for k, s in enumerate(proba):
                    ema = EMA_ALPHA * s + (1 - EMA_ALPHA) * ema
                    if ema < critical:
                        hit = k
                        break
                if oid == uid:
                    genuine_runs += 1
                    false_alarms += hit is not None
                else:
                    impostor_runs += 1
                    if hit is not None:
                        detected += 1
                        keys_to_detect.append(WINDOW_SIZE + hit * WINDOW_STRIDE)
    return {
        "critical_threshold": critical,
        "ema_alpha": EMA_ALPHA,
        "impostor_sessions": impostor_runs,
        "impostor_detection_rate": detected / impostor_runs if impostor_runs else 0.0,
        "median_keystrokes_to_detect": float(np.median(keys_to_detect)) if keys_to_detect else None,
        "genuine_sessions": genuine_runs,
        "genuine_false_alarm_rate": false_alarms / genuine_runs if genuine_runs else 0.0,
    }


def cross_validate(users: dict[str, UserData], seed: int = 7, critical: float = 0.5) -> dict:
    """Leave-users-out CV: test users are never seen in training, as a new enrollee wouldn't be."""
    ids = sorted(users)
    k = min(5, len(ids))
    if k < 3:
        raise ValueError("need at least 3 usable users for cross-validation")
    rng = np.random.default_rng(seed)
    ys, rf_scores, base_scores, sims = [], [], [], []
    for train_idx, test_idx in GroupKFold(n_splits=k).split(ids, groups=ids):
        tr = [ids[i] for i in train_idx]
        te = [ids[i] for i in test_idx]
        if len(te) < 2:
            continue  # impostor pairs need two test users
        Xtr, ytr = build_pairs(users, tr, rng)
        Xte, yte = build_pairs(users, te, rng)
        model = RandomForestClassifier(**RF_PARAMS).fit(Xtr, ytr)
        ys.append(yte)
        rf_scores.append(model.predict_proba(Xte)[:, 1])
        base_scores.append(-Xte.mean(axis=1))  # scaled-Manhattan baseline: smaller distance = genuine
        sims.append(continuous_simulation(model, users, te, critical))

    y = np.concatenate(ys)
    rf = np.concatenate(rf_scores)
    base = np.concatenate(base_scores)
    rf_eer, rf_eer_thr = eer(y, rf)
    b_eer, _ = eer(y, base)

    def merge(key: str) -> float:
        tot = sum(s["impostor_sessions" if "impostor" in key else "genuine_sessions"] for s in sims)
        num = sum(s[key] * s["impostor_sessions" if "impostor" in key else "genuine_sessions"] for s in sims)
        return num / tot if tot else 0.0

    detect = [s["median_keystrokes_to_detect"] for s in sims if s["median_keystrokes_to_detect"] is not None]
    return {
        "folds": k,
        "test_pairs": int(y.size),
        "rf": {
            "auc": float(roc_auc_score(y, rf)),
            "eer": rf_eer,
            "eer_threshold": rf_eer_thr,
            "at_0_5": classification_report(y, rf, 0.5),
            "at_eer": classification_report(y, rf, rf_eer_thr),
            "roc": roc_points(y, rf),
        },
        "baseline_scaled_manhattan": {
            "auc": float(roc_auc_score(y, base)),
            "eer": b_eer,
            "roc": roc_points(y, base),
        },
        "continuous": {
            "critical_threshold": critical,
            "ema_alpha": EMA_ALPHA,
            "impostor_detection_rate": merge("impostor_detection_rate"),
            "genuine_false_alarm_rate": merge("genuine_false_alarm_rate"),
            "median_keystrokes_to_detect": float(np.median(detect)) if detect else None,
            "impostor_sessions": sum(s["impostor_sessions"] for s in sims),
            "genuine_sessions": sum(s["genuine_sessions"] for s in sims),
        },
    }
