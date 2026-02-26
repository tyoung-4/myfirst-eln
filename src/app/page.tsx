import Link from "next/link";
import AppTopNav from "@/components/AppTopNav";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <AppTopNav />
        <div className="mb-8 space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Electronic Lab Notebook</p>
          <h1 className="text-3xl font-semibold text-zinc-100 sm:text-4xl">Main Interface</h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            Start with Protocols (fully implemented), then expand Inventory, Schedule, and the general reference
            section as features are added.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-emerald-500/30 bg-zinc-900 p-5 shadow-lg shadow-emerald-950/30">
            <p className="text-sm font-semibold text-emerald-300">Protocols</p>
            <p className="mt-1 text-xs text-zinc-400">Open protocol authoring or active protocol runs.</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href="/entries"
                className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-400/20"
              >
                Protocol Editor
              </Link>
              <Link
                href="/runs"
                className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-400/20"
              >
                Protocol Runs
              </Link>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <p className="text-sm font-semibold text-zinc-200">Inventory</p>
            <p className="mt-1 text-xs text-zinc-400">Reagents, materials, and stock tracking.</p>
            <button
              disabled
              className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-500"
            >
              Coming Soon
            </button>
          </section>

          <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <p className="text-sm font-semibold text-zinc-200">Schedule</p>
            <p className="mt-1 text-xs text-zinc-400">Calendar, timing, and execution planning.</p>
            <button
              disabled
              className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-500"
            >
              Coming Soon
            </button>
          </section>

          <section className="rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <p className="text-sm font-semibold text-zinc-200">Knowledge Hub (TBD)</p>
            <p className="mt-1 text-xs text-zinc-400">
              Admin notes, code references, publications, and other important shared information.
            </p>
            <button
              disabled
              className="mt-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-500"
            >
              Define Module
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
