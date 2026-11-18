import numpy as np
import pytest
from sklearn.ensemble import RandomForestClassifier

from keydna import features as fx
from keydna import verifier as vf
from keydna.data import Session, by_user
from keydna.synth import sample_typist, simulate_session
from train import export_forest


def test_window_features_known_values():
    # L down@0 up@100, R down@150 up@230 (cross, fluent), S down@1000 (pause), B, L
    ev = [(0, 100, "L"), (150, 230, "R"), (1000, 1080, "S"), (1100, 1150, "B"), (1200, 1290, "L")]
    f = dict(zip(fx.FEATURE_NAMES, fx.window_features(ev)))
    assert f["hold_mean"] == pytest.approx((100 + 80 + 80 + 50 + 90) / 5)
    # intervals: 150, 850 (pause), 100, 100 → fluent = [150, 100, 100]
    assert f["flight_mean"] == pytest.approx(350 / 3)
    assert f["pause_rate"] == pytest.approx(1 / 4)
    assert f["pause_mean"] == pytest.approx(850)
    assert f["backspace_rate"] == pytest.approx(1 / 5)
    assert f["correction_latency"] == pytest.approx(100)  # S→B interval
    assert f["burst_mean"] == pytest.approx(2.5)  # [L R] [S B L]
    assert f["flight_cross_mean"] == pytest.approx(150)
    assert f["overlap_rate"] == 0.0
    # 4 typed chars over 1200 ms active → (4/5) / 0.02 min = 40 wpm
    assert f["wpm"] == pytest.approx(40)


def test_rollover_detected():
    ev = [(0, 200, "L"), (100, 250, "R"), (200, 300, "L")]
    f = dict(zip(fx.FEATURE_NAMES, fx.window_features(ev)))
    assert f["overlap_rate"] == 1.0
    assert f["ud_mean"] < 0


def _sessions(n_users=4, n_sessions=3, seed=1):
    rng = np.random.default_rng(seed)
    out = []
    for u in range(n_users):
        t = sample_typist(rng, f"u{u}")
        for s in range(n_sessions):
            out.append(Session(f"u{u}", f"u{u}-s{s}", "demo", f"2026-01-0{s + 1}", [tuple(e) for e in simulate_session(t, rng)]))
    return out


def test_enrollment_never_overlaps_probes():
    grouped = by_user(_sessions())
    for sessions in grouped.values():
        enroll, probes = vf.split_enrollment(sessions)
        assert len(enroll) == vf.ENROLL_KEYS
        enrolled_ids = {s.session_id for s in sessions[: len(sessions) - len(probes)]}
        assert enrolled_ids.isdisjoint({p.session_id for p in probes})


def test_cv_folds_are_user_disjoint():
    from sklearn.model_selection import GroupKFold

    ids = [f"u{i}" for i in range(6)]
    for tr, te in GroupKFold(n_splits=3).split(ids, groups=ids):
        assert not set(np.array(ids)[tr]) & set(np.array(ids)[te])


def test_exported_forest_matches_sklearn():
    users = vf.prepare_users(by_user(_sessions()))
    X, y = vf.build_pairs(users, sorted(users), np.random.default_rng(0))
    model = RandomForestClassifier(n_estimators=10, max_depth=6, random_state=0).fit(X, y)
    trees = export_forest(model)

    def walk(x):
        x = x.astype(np.float32)
        total = 0.0
        for t in trees:
            i = 0
            while t["f"][i] != -1:
                i = t["l"][i] if x[t["f"][i]] <= t["t"][i] else t["r"][i]
            total += t["v"][i]
        return total / len(trees)

    ours = np.array([walk(x) for x in X[:200]])
    np.testing.assert_allclose(ours, model.predict_proba(X[:200])[:, 1], atol=1e-5)


def test_distance_cap_and_floor():
    k = len(fx.FEATURE_NAMES)
    p = vf.Profile(mean=np.zeros(k), std=np.zeros(k), n_windows=5)
    x = np.zeros((1, k))
    i_bs, i_hold = fx.FEATURE_NAMES.index("backspace_rate"), fx.FEATURE_NAMES.index("hold_mean")
    x[0, i_bs] = fx.STD_FLOOR["backspace_rate"]  # one floor-sized step after a backspace-free enrollment
    x[0, i_hold] = 1e9
    d = vf.distances(x, p)
    assert d[0, i_bs] == pytest.approx(1.0)  # one floor-sized step, not a maximal deviation
    assert d[0, i_hold] == vf.D_CAP
