import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Camera,
  LineChart,
  MessageSquareHeart,
  Flame,
  HeartHandshake,
} from "lucide-react";

const STATS = [
  { value: "10s", label: "to log a meal" },
  { value: "0", label: "guilt trips" },
  { value: "24/7", label: "AI coach on call" },
  { value: "1", label: "number that matters" },
];

const FEATURES = [
  {
    icon: Camera,
    title: "Log by text or photo",
    desc: "Type what you ate in plain English or snap a photo. The AI does the parsing.",
  },
  {
    icon: Flame,
    title: "Instant calorie + macro estimates",
    desc: "Calories, protein, carbs, and fat in seconds — with a confidence level, never fake precision.",
  },
  {
    icon: LineChart,
    title: "Weight trend & goal date",
    desc: "7-day averages smooth out the noise and project when you'll actually hit your goal.",
  },
  {
    icon: MessageSquareHeart,
    title: "Daily AI coaching",
    desc: "Direct, practical advice that uses your real targets, intake, and trend — not generic tips.",
  },
];

export default function Home() {
  return (
    <div className="-mt-8">
      {/* Hero */}
      <section className="relative overflow-hidden px-1 pb-20 pt-16 md:pt-24">
        {/* decorative orbs */}
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-lime-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-500/25 bg-lime-500/10 px-4 py-1.5">
            <Zap className="h-4 w-4 text-lime-400" />
            <span className="text-sm font-medium text-lime-300">
              Your AI fitness coach, no shame attached
            </span>
          </div>

          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            Stop guessing.
            <br />
            Start <span className="gradient-text">GoThin</span>.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted md:text-xl">
            Log meals and weight in plain English. Get honest calorie estimates,
            a clear progress trend, and a coach that tells you what to do next.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn btn-primary group !px-6 !py-3 text-base">
              Get started free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="#features" className="btn btn-ghost !px-6 !py-3 text-base">
              See how it works
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <div className="gradient-text font-display text-3xl font-extrabold md:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Everything you need to <span className="gradient-text">stay consistent</span>
          </h2>
          <p className="mt-3 text-muted">
            Not another calorie tracker. A coach that answers: what happened today,
            am I on track, and what should I do next?
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover p-6">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-400/20 to-emerald/20 text-brand-300 ring-1 ring-brand-500/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="py-12">
        <div className="card relative overflow-hidden p-8 text-center md:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative">
            <HeartHandshake className="mx-auto mb-4 h-9 w-9 text-brand-300" />
            <h2 className="text-3xl font-bold md:text-4xl">
              The app that won&apos;t shame you
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              Build the habit, see the trend, and get practical advice for tomorrow.
              Start tracking in under a minute.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn btn-primary group !px-6 !py-3 text-base">
                Create your account
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/meal" className="btn btn-ghost !px-6 !py-3 text-base">
                Try logging a meal
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
