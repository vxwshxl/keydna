# Viva crib sheet

**What is KeyDNA?**
A machine-learning-based continuous authentication system that verifies identity through typing behaviour. Instead of authenticating only at login, it continuously analyses key hold duration, inter-key timing, rhythm, pauses and corrections. A Random Forest compares each 60-keystroke window against the enrolled behavioural profile and outputs an identity-confidence score. If the behaviour deviates significantly, KeyDNA raises a security alert and requests re-authentication.

**Why not just use WPM?**
WPM measures performance, not identity. Two people can share a WPM and have completely different holds, rhythm, pauses and corrections. In our trained model, WPM carries well under 1% of the feature importance.

**Why is this cybersecurity?**
Login checks identity once. KeyDNA covers the post-login period, detecting session takeover, an unattended unlocked machine, and account sharing.

**Is it a biometric?**
It's a behavioural-biometric approach. It should be treated as an additional authentication signal, not a replacement for passwords or MFA.

**Can attackers spoof it?**
Potentially. No behavioural biometric is perfect. KeyDNA is a continuous risk signal; production systems would combine it with MFA, device identity and context.

**Why a verifier and not a multiclass classifier?**
A multiclass model can only recognise people it was trained on and must be retrained for every new user. Our Random Forest learns what *genuine vs impostor distances to a profile* look like, so it works for a new user immediately after a one-minute enrollment. That's exactly the continuous-authentication setting.

**How did you avoid data leakage?**
Two ways. (1) Leave-users-out cross-validation: test typists never appear in training. (2) Session split: each person enrolls on their first 320 keystrokes, only later sessions are scored, and the rest of the enrollment session is discarded. We never randomly split keystrokes from the same session.

**Why FAR, FRR and EER?**
FAR is how often an impostor is accepted (security). FRR is how often the real user is rejected (usability). Moving the threshold trades one for the other. EER is the point where they're equal, which is the standard single-number summary for biometric systems.

**Why smoothing?**
One window can be noisy (a typo burst, a pause). An exponential moving average (α = 0.35) stops the score from jumping, so an alert needs sustained deviation. In replay, takeovers were detected after a median of 80 keystrokes.

**Are your results real?**
The shipped numbers come from synthetic typists and are labelled preliminary everywhere. The pipeline, model and metrics code are real; collecting real participants via `/collect` and running `train.py --data real` produces real-world numbers with the same code.

**What is novel?**
Not the concept: keystroke dynamics is established research. The contribution is the combination: browser capture, Monkeytype-assisted enrollment, a user-independent verifier with leakage-controlled evaluation, live explainability, attack simulation, a phone companion, and privacy-first features (hand zones, never characters).
