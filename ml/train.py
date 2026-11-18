"""Train, evaluate and export the KeyDNA verifier.

    uv run train.py                 # auto: real collected data if enough exists, else demo
    uv run train.py --data demo     # synthetic demo typists only
    uv run train.py --data real     # only sessions in data/raw/ (from the /collect page)
    uv run train.py --data combined # both

Steps: load → clean → features (sliding windows) → session/user split → Random Forest →
leave-users-out evaluation → final fit → save artifacts → export for the web app.
Every number printed here is computed from the data; nothing is hard-coded.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

from generate_demo_data import DEMO_HOLDOUT
from keydna import features as fx
from keydna import verifier as vf
from keydna.data import ML_DIR, Session, by_user, load_demo, load_raw

WEB_DIR = ML_DIR.parent
MODEL_VERSION = "1.0.0"


def choose_data(mode: str) -> tuple[list[Session], str]:
    demo = [s for s in load_demo() if s.user_id not in DEMO_HOLDOUT]
    raw = load_raw()
    real_users = {u for u, ss in by_user(raw).items() if len(ss) >= 2}
    if mode == "auto":
        mode = "real" if len(real_users) >= 3 else "demo"
    if mode == "demo":
        return demo, "synthetic-demo"
    if mode == "real":
        if len(real_users) < 3:
            raise SystemExit("need ≥3 people with ≥2 sessions each in data/raw/ — record them at /collect")
        return raw, "real"
    return demo + raw, "combined"


def export_forest(model: RandomForestClassifier) -> list[dict]:
    """Flatten sklearn trees into arrays the TypeScript scorer walks.

    sklearn compares float32(x) <= threshold, so the web scorer casts with Math.fround.
    Leaf value = weighted fraction of the 'genuine' class, which is what predict_proba averages.
    """
    trees = []
    for est in model.estimators_:
        t = est.tree_
        val = t.value[:, 0, :]
        frac = val[:, 1] / val.sum(axis=1)
        leaf = t.children_left == -1
        trees.append(
            {
                "f": np.where(leaf, -1, t.feature).astype(int).tolist(),
                "t": np.where(leaf, 0.0, t.threshold).tolist(),
                "l": t.children_left.astype(int).tolist(),
                "r": t.children_right.astype(int).tolist(),
                "v": np.where(leaf, np.round(frac, 6), 0.0).tolist(),
            }
        )
    return trees


def config_block() -> dict:
    return {
        "window_size": fx.WINDOW_SIZE,
        "window_stride": fx.WINDOW_STRIDE,
        "live_stride": vf.LIVE_STRIDE,
        "enroll_keys": vf.ENROLL_KEYS,
        "enroll_stride": vf.ENROLL_STRIDE,
        "pause_ms": fx.PAUSE_MS,
        "idle_ms": fx.IDLE_MS,
        "rel_floor": vf.REL_FLOOR,
        "abs_floor": vf.ABS_FLOOR.tolist(),
        "d_cap": vf.D_CAP,
        "ema_alpha": vf.EMA_ALPHA,
    }


def write_json(path: Path, obj: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, separators=(",", ":")))


def demo_pack() -> dict:
    """Held-out demo typists for the web demo: enrollment keystrokes + unseen probe sessions."""
    grouped = by_user([s for s in load_demo() if s.user_id in DEMO_HOLDOUT])
    out = {}
    for uid in DEMO_HOLDOUT:
        enroll, probes = vf.split_enrollment(grouped[uid])
        out[uid] = {
            "enroll": [list(e) for e in enroll],
            "probes": [[list(e) for e in s.events] for s in probes],
        }
    return {"notice": "SYNTHETIC DEMO DATA — generated typists, not real people", "typists": out}


def parity_fixture(model: RandomForestClassifier) -> dict:
    grouped = by_user([s for s in load_demo() if s.user_id in DEMO_HOLDOUT])
    enroll, probes_a = vf.split_enrollment(grouped["demo-a"])
    enroll_F = fx.session_feature_matrix(enroll, fx.WINDOW_SIZE, vf.ENROLL_STRIDE)
    prof = vf.profile_from_matrix(enroll_F)
    cases = []
    for label, session in (("genuine", probes_a[0]), ("impostor", grouped["demo-b"][-1])):
        for w in fx.windows(session.events)[:4]:
            x = fx.window_features(w)
            d = vf.distances(x[None, :], prof)
            cases.append(
                {
                    "label": label,
                    "events": [list(e) for e in w],
                    "features": x.tolist(),
                    "distances": d[0].tolist(),
                    "proba": float(model.predict_proba(d)[0, 1]),
                }
            )
    return {
        "enroll_events": [list(e) for e in enroll],
        "profile": {"mean": prof.mean.tolist(), "std": prof.std.tolist(), "n_windows": prof.n_windows},
        "cases": cases,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", choices=["auto", "demo", "real", "combined"], default="auto")
    ap.add_argument("--critical", type=float, default=0.5, help="EMA score that counts as a detected takeover")
    args = ap.parse_args()

    print("Training KeyDNA...\n")
    sessions, kind = choose_data(args.data)
    grouped = by_user(sessions)
    users = vf.prepare_users(grouped)
    keystrokes = sum(len(s.events) for s in sessions)
    n_windows = sum(m.shape[0] for u in users.values() for m in u.probes)
    print(f"Dataset: {kind}{'  (SYNTHETIC — not real human data)' if kind != 'real' else ''}")
    print(f"Users: {len(users)}  (of {len(grouped)} loaded; others lack enough sessions)")
    print(f"Sessions: {len(sessions)}")
    print(f"Keystrokes: {keystrokes:,}")
    print(f"Probe windows: {n_windows:,}")
    print(f"Features: {len(fx.FEATURE_NAMES)}\n")

    print(f"Leave-users-out cross-validation (Random Forest vs scaled-Manhattan baseline)...")
    cv = vf.cross_validate(users, critical=args.critical)
    rf = cv["rf"]
    rep = rf["at_0_5"]
    print(f"  folds: {cv['folds']}  test pairs: {cv['test_pairs']:,}")
    print(f"  Accuracy:  {rep['accuracy']:.1%}")
    print(f"  Precision: {rep['precision']:.1%}")
    print(f"  Recall:    {rep['recall']:.1%}")
    print(f"  F1:        {rep['f1']:.1%}")
    print(f"  FAR / FRR: {rep['far']:.1%} / {rep['frr']:.1%}  (threshold 0.5)")
    print(f"  ROC AUC:   {rf['auc']:.3f}   EER: {rf['eer']:.1%} at score {rf['eer_threshold']:.3f}")
    print(f"  Baseline scaled-Manhattan EER: {cv['baseline_scaled_manhattan']['eer']:.1%}")
    c = cv["continuous"]
    mk = c["median_keystrokes_to_detect"]
    print(
        f"  Continuous replay: {c['impostor_detection_rate']:.1%} of impostor sessions flagged"
        f" (median {mk:.0f} keystrokes), {c['genuine_false_alarm_rate']:.1%} genuine false alarms\n"
        if mk is not None
        else "  Continuous replay: no impostor session crossed the critical threshold\n"
    )

    print("Fitting final model on all users...")
    X, y = vf.build_pairs(users, sorted(users), np.random.default_rng(11))
    model = RandomForestClassifier(**vf.RF_PARAMS).fit(X, y)

    imp = model.feature_importances_
    importance = sorted(
        (
            {"name": n, "label": fx.FEATURE_LABELS[n], "group": fx.FEATURE_GROUPS[n], "importance": float(v)}
            for n, v in zip(fx.FEATURE_NAMES, imp)
        ),
        key=lambda r: -r["importance"],
    )
    groups: dict[str, float] = {}
    for r in importance:
        groups[r["group"]] = groups.get(r["group"], 0.0) + r["importance"]

    dataset_hash = hashlib.sha256(
        json.dumps([(s.session_id, len(s.events)) for s in sessions]).encode()
    ).hexdigest()[:12]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    preliminary = kind != "real" or len(users) < 10
    metadata = {
        "model": "RandomForestClassifier (genuine-vs-impostor verifier on profile distances)",
        "model_version": MODEL_VERSION,
        "trained_at": now,
        "dataset": {
            "kind": kind,
            "version": dataset_hash,
            "users": len(users),
            "sessions": len(sessions),
            "keystrokes": keystrokes,
            "probe_windows": n_windows,
            "training_pairs": int(y.size),
        },
        "feature_names": fx.FEATURE_NAMES,
        "rf_params": {k: v for k, v in vf.RF_PARAMS.items() if k != "n_jobs"},
        "config": config_block(),
        "thresholds": {"decision": 0.5, "eer": rf["eer_threshold"], "critical_ema": args.critical},
    }

    models_dir = ML_DIR / "models"
    models_dir.mkdir(exist_ok=True)
    joblib.dump(model, models_dir / "keydna_model.joblib")
    (models_dir / "metadata.json").write_text(json.dumps(metadata, indent=2))

    write_json(
        WEB_DIR / "public" / "model" / "keydna-rf.json",
        {"format": "keydna.rf.v1", **metadata, "trees": export_forest(model)},
    )
    write_json(
        WEB_DIR / "public" / "model" / "metrics.json",
        {
            "generated_at": now,
            "preliminary": preliminary,
            "dataset": metadata["dataset"],
            "model_version": MODEL_VERSION,
            "model": metadata["model"],
            "rf_params": metadata["rf_params"],
            "config": metadata["config"],
            "thresholds": metadata["thresholds"],
            "n_features": len(fx.FEATURE_NAMES),
            "evaluation": cv,
            "feature_importance": importance,
            "group_importance": sorted(({"group": g, "importance": v} for g, v in groups.items()), key=lambda r: -r["importance"]),
        },
    )
    write_json(WEB_DIR / "public" / "demo" / "demo-pack.json", demo_pack())
    (WEB_DIR / "src" / "lib" / "keydna" / "__fixtures__").mkdir(parents=True, exist_ok=True)
    write_json(WEB_DIR / "src" / "lib" / "keydna" / "__fixtures__" / "parity.json", parity_fixture(model))

    size_kb = (WEB_DIR / "public" / "model" / "keydna-rf.json").stat().st_size / 1024
    print("Model saved.")
    print(f"  ml/models/keydna_model.joblib, ml/models/metadata.json")
    print(f"  public/model/keydna-rf.json ({size_kb:,.0f} KB), public/model/metrics.json")
    print(f"  public/demo/demo-pack.json, src/lib/keydna/__fixtures__/parity.json")
    print(f"\nTop features: " + ", ".join(f"{r['label']} {r['importance']:.1%}" for r in importance[:4]))


if __name__ == "__main__":
    main()
