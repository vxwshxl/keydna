import { ArrowDown, BrainCircuit, EyeOff, Fingerprint, KeyRound, Lock, ShieldAlert, ShieldCheck, Smartphone, Timer, UserRoundX, Waves } from "lucide-react";
import Link from "next/link";
import { HeroVisual } from "@/components/landing/hero-visual";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

const REPO = "https://github.com/vxwshxl/keydna";

function Flow({ title, tone, steps }: { title: string; tone: "danger" | "success"; steps: { icon: React.ElementType; text: string; bad?: boolean }[] }) {
  return (
    <div className="card3d p-6" data-tone={tone}>
      <p className={tone === "danger" ? "eyebrow !text-danger" : "eyebrow !text-success"}>{title}</p>
      <ol className="mt-4 flex flex-col items-start gap-1">
        {steps.map((s, i) => (
          <li key={s.text} className="flex flex-col items-start">
            <span className={`flex items-center gap-3 rounded-xl px-3 py-2 font-extrabold ${s.bad ? "bg-danger-subtle text-danger" : "bg-muted"}`}>
              <s.icon className="size-5" aria-hidden /> {s.text}
            </span>
            {i < steps.length - 1 && <ArrowDown className="my-1 ml-5 size-4 text-secondary-fg" aria-hidden />}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-5 sm:px-6">
        <Logo />
        <nav aria-label="Site" className="ml-auto hidden items-center gap-6 text-sm font-extrabold text-secondary-fg uppercase sm:flex">
          <a href="#how" className="hover:text-foreground">How it works</a>
          <Link href="/model" className="hover:text-foreground">Model</Link>
          <a href={REPO} className="hover:text-foreground">GitHub</a>
        </nav>
        <ButtonLink href="/dashboard" size="sm" tone="plain" className="ml-auto sm:ml-0">Open app</ButtonLink>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
          <div className="anim-rise">
            <p className="eyebrow">Behavioural biometrics · continuous authentication</p>
            <h1 className="mt-3 text-5xl leading-[1.02] font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Your typing<br />has a <span className="text-dna">DNA</span>.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-secondary-fg">
              Continuous authentication powered by machine learning and keystroke dynamics. A password proves who logged in — KeyDNA keeps checking that it&apos;s still you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/enroll" size="lg">Build my typing DNA</ButtonLink>
              <ButtonLink href="/security?demo=1" size="lg" tone="ghost">View security demo</ButtonLink>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm font-bold text-secondary-fg">
              <EyeOff className="size-4" aria-hidden /> KeyDNA analyses typing behaviour, not what you type.
            </p>
          </div>
          <HeroVisual />
        </section>

        <section id="how" className="border-y-2 border-border bg-elevated py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="eyebrow">The gap after login</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">Passwords verify the login. KeyDNA verifies the user.</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <Flow
                title="Traditional authentication"
                tone="danger"
                steps={[
                  { icon: KeyRound, text: "Password / MFA" },
                  { icon: ShieldCheck, text: "Access granted" },
                  { icon: UserRoundX, text: "Someone else takes over", bad: true },
                  { icon: ShieldAlert, text: "…and keeps going, unnoticed", bad: true },
                ]}
              />
              <Flow
                title="With KeyDNA"
                tone="success"
                steps={[
                  { icon: KeyRound, text: "Password / MFA" },
                  { icon: Fingerprint, text: "Behavioural baseline" },
                  { icon: Waves, text: "Every 15 keys: does this still match?" },
                  { icon: Lock, text: "Strong deviation → re-authenticate / lock" },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="eyebrow">What the model reads</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">Speed is performance. Timing behaviour is identity.</h2>
          <p className="mt-3 max-w-2xl text-secondary-fg">Two people can share a WPM and still type nothing alike. KeyDNA extracts 25 behavioural features from every rolling window of 60 keystrokes.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Timer, t: "Hold & interval timing", d: "How long each key stays down and the gap to the next — mean, median, spread, percentiles." },
              { icon: Waves, t: "Rhythm & bursts", d: "Rhythm variability, pauses, burst length and key rollover." },
              { icon: Fingerprint, t: "Hand transitions", d: "Left-to-right vs same-hand vs word-boundary timing — physical, text-independent." },
              { icon: ShieldAlert, t: "Correction behaviour", d: "Backspace rate, how fast you notice a typo, how many keys you delete." },
            ].map((f) => (
              <div key={f.t} className="card3d p-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent-subtle text-primary"><f.icon className="size-5" aria-hidden /></span>
                <h3 className="mt-4 text-lg font-black">{f.t}</h3>
                <p className="mt-1 text-sm text-secondary-fg">{f.d}</p>
              </div>
            ))}
          </div>

          <div className="card3d mt-10 p-6">
            <p className="eyebrow mb-4">Making the machine learning visible</p>
            <ol className="flex flex-wrap items-center gap-2 font-mono text-sm font-medium">
              {["RAW TYPING", "FEATURE EXTRACTION", "BEHAVIOURAL PROFILE", "RANDOM FOREST", "IDENTITY CONFIDENCE", "SECURITY DECISION"].map((s, i, a) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`rounded-xl px-3 py-2 ${i === 3 ? "bg-dna text-primary-foreground" : "bg-muted"}`}>{s}</span>
                  {i < a.length - 1 && <span aria-hidden className="text-secondary-fg">→</span>}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t-2 border-border bg-elevated py-20">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-3">
            {[
              { icon: BrainCircuit, t: "A real ML pipeline", d: "scikit-learn Random Forest trained with leave-users-out validation, exported to the browser and checked for exact parity with Python." },
              { icon: EyeOff, t: "Privacy first", d: "Password fields are ignored. Only key timing and hand zone are captured; inference runs locally by default." },
              { icon: Smartphone, t: "Phone companion", d: "Pair your iPhone to see session confidence and lock the session when a takeover is flagged." },
            ].map((f) => (
              <div key={f.t}>
                <f.icon className="size-7 text-dna" aria-hidden />
                <h3 className="mt-3 text-xl font-black">{f.t}</h3>
                <p className="mt-1 text-secondary-fg">{f.d}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-12 max-w-3xl px-4 text-center text-sm font-bold text-secondary-fg">
            KeyDNA is a risk signal for continuous authentication, not a perfect biometric replacement. A knowledgeable attacker could imitate typing behaviour — combine it with MFA and device signals.
          </p>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-secondary-fg sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-bold">KeyDNA: A Machine Learning-Based Continuous Authentication System Using Keystroke Dynamics</p>
        <a href={REPO} className="font-extrabold text-primary hover:underline">Source on GitHub</a>
      </footer>
    </div>
  );
}
