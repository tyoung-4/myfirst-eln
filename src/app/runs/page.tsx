"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ProtocolRun } from "@/models/protocolRun";
import RunLockedView from "@/components/RunLockedView";
import AppTopNav from "@/components/AppTopNav";

type CurrentUser = {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
};

type InteractionState = {
  stepCompletion: Record<string, boolean>;
  components: Record<string, boolean>;
  componentAmounts: Record<string, string>;
  entryFields: Record<string, string>;
  timers: Record<string, { total: number; remaining: number; running: boolean; locked: boolean }>;
};

const DEFAULT_USER: CurrentUser = {
  id: "default-user",
  name: "Default",
  role: "MEMBER",
};

const ADMIN_USER: CurrentUser = {
  id: "admin-user",
  name: "Admin",
  role: "ADMIN",
};

type ViewMode = "active" | "history";
type SortBy = "newest" | "oldest" | "title" | "protocol" | "status";

function parseInteractionState(raw: string): InteractionState {
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      stepCompletion: parsed.stepCompletion ?? {},
      components: parsed.components ?? {},
      componentAmounts: parsed.componentAmounts ?? {},
      entryFields: parsed.entryFields ?? {},
      timers: parsed.timers ?? {},
    };
  } catch {
    return { stepCompletion: {}, components: {}, componentAmounts: {}, entryFields: {}, timers: {} };
  }
}

function RunsPageContent() {
  const searchParams = useSearchParams();
  const initialRunId = searchParams.get("runId");

  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEFAULT_USER);
  const [runs, setRuns] = useState<ProtocolRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initialRunId);
  const [viewMode, setViewMode] = useState<ViewMode>(initialRunId ? "active" : "history");
  const [loading, setLoading] = useState(false);

  const [interactionState, setInteractionState] = useState<InteractionState>({
    stepCompletion: {},
    components: {},
    componentAmounts: {},
    entryFields: {},
    timers: {},
  });
  const [notes, setNotes] = useState("");
  const [utilityMinutes, setUtilityMinutes] = useState(5);
  const [utilitySeconds, setUtilitySeconds] = useState(0);
  const [utilityTimer, setUtilityTimer] = useState({
    total: 300,
    remaining: 300,
    running: false,
    locked: false,
  });

  const [historySortBy, setHistorySortBy] = useState<SortBy>("newest");
  const [historyQuery, setHistoryQuery] = useState("");

  const authHeaders = useMemo(
    () => ({
      "x-user-id": currentUser.id,
      "x-user-name": currentUser.name,
      "x-user-role": currentUser.role,
    }),
    [currentUser]
  );

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/protocol-runs", { headers: authHeaders });
      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error("Failed to load protocol runs:", res.status, text);
        setRuns([]);
        return;
      }

      const data = (await res.json()) as ProtocolRun[];
      setRuns(data);

      if (data.length === 0) {
        setSelectedRunId(null);
        setInteractionState({ stepCompletion: {}, components: {}, componentAmounts: {}, entryFields: {}, timers: {} });
        setNotes("");
        return;
      }

      const preferred =
        (initialRunId && data.find((run) => run.id === initialRunId)) ||
        (selectedRunId && data.find((run) => run.id === selectedRunId)) ||
        data[0];

      setSelectedRunId(preferred.id);
      setInteractionState(parseInteractionState(preferred.interactionState));
      setNotes(preferred.notes || "");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, initialRunId, selectedRunId]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!utilityTimer.running || utilityTimer.locked) return;
    const id = window.setInterval(() => {
      setUtilityTimer((prev) => {
        const next = Math.max(0, prev.remaining - 1);
        return {
          ...prev,
          remaining: next,
          running: next > 0,
        };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [utilityTimer.running, utilityTimer.locked]);

  const selectedRun = useMemo(() => runs.find((run) => run.id === selectedRunId) || null, [runs, selectedRunId]);

  const activeRuns = useMemo(() => runs.filter((run) => run.status === "IN_PROGRESS"), [runs]);

  useEffect(() => {
    if (viewMode !== "active") return;
    if (activeRuns.length === 0) return;
    if (selectedRun && selectedRun.status === "IN_PROGRESS") return;
    const first = activeRuns[0];
    setSelectedRunId(first.id);
    setInteractionState(parseInteractionState(first.interactionState));
    setNotes(first.notes || "");
  }, [viewMode, activeRuns, selectedRun]);

  const historyRuns = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    const filtered = runs.filter((run) => {
      if (!query) return true;
      const haystack = `${run.title} ${run.sourceEntry?.title || ""} ${run.status} ${run.runner?.name || ""}`.toLowerCase();
      return haystack.includes(query);
    });

    filtered.sort((a, b) => {
      if (historySortBy === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (historySortBy === "title") return a.title.localeCompare(b.title);
      if (historySortBy === "protocol") return (a.sourceEntry?.title || "").localeCompare(b.sourceEntry?.title || "");
      if (historySortBy === "status") return a.status.localeCompare(b.status);
      return b.createdAt.localeCompare(a.createdAt);
    });

    return filtered;
  }, [runs, historyQuery, historySortBy]);

  async function handleSelectRun(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/protocol-runs/${id}`, { headers: authHeaders });
      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error("Failed to load protocol run:", res.status, text);
        return;
      }

      const run = (await res.json()) as ProtocolRun;
      setRuns((prev) => prev.map((item) => (item.id === run.id ? run : item)));
      setSelectedRunId(run.id);
      setInteractionState(parseInteractionState(run.interactionState));
      setNotes(run.notes || "");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRun() {
    if (!selectedRun) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/protocol-runs/${selectedRun.id}`, {
        method: "PUT",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interactionState: JSON.stringify(interactionState),
          notes,
          status: selectedRun.status,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error("Failed to save run:", res.status, text);
        return;
      }

      const updated = (await res.json()) as ProtocolRun;
      setRuns((prev) => prev.map((run) => (run.id === updated.id ? updated : run)));
      setSelectedRunId(updated.id);
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function applyUtilityDuration(minutes: number, seconds: number) {
    const safeMinutes = Math.max(0, minutes);
    const safeSeconds = Math.min(59, Math.max(0, seconds));
    const total = safeMinutes * 60 + safeSeconds;
    setUtilityMinutes(safeMinutes);
    setUtilitySeconds(safeSeconds);
    setUtilityTimer({
      total: Math.max(1, total),
      remaining: Math.max(1, total),
      running: false,
      locked: false,
    });
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-zinc-950 p-6 text-zinc-100">
      <AppTopNav />

      <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-4 py-2">
        <div>
          <h1 className="text-base font-semibold text-zinc-100">Protocol Runs</h1>
          <p className="text-xs text-zinc-400">Run active protocols or review locked historical runs.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span>
            User: <span className="font-semibold text-zinc-100">{currentUser.name}</span>
          </span>
          <select
            value={currentUser.role}
            onChange={(e) => {
              const next = e.target.value === "ADMIN" ? ADMIN_USER : DEFAULT_USER;
              setCurrentUser(next);
              setSelectedRunId(null);
            }}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
          >
            <option value="MEMBER">Login as Default</option>
            <option value="ADMIN">Login as Admin</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode("active")}
          className={`rounded px-3 py-1.5 text-sm ${viewMode === "active" ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
        >
          Active Run
        </button>
        <button
          onClick={() => setViewMode("history")}
          className={`rounded px-3 py-1.5 text-sm ${viewMode === "history" ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
        >
          Run History
        </button>
      </div>

      {viewMode === "active" ? (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="rounded border border-zinc-800 bg-zinc-900 p-3">
            <h2 className="mb-2 text-lg font-semibold text-zinc-100">Active Runs</h2>
            <ul className="space-y-2">
              {activeRuns.map((run) => (
                <li key={run.id}>
                  <button
                    onClick={() => handleSelectRun(run.id)}
                    className={`w-full rounded border px-3 py-2 text-left ${selectedRun?.id === run.id ? "border-indigo-500 bg-indigo-500/20" : "border-zinc-700 bg-zinc-800"}`}
                  >
                    <p className="text-sm font-semibold text-zinc-100">{run.title}</p>
                    <p className="text-xs text-zinc-400">{run.sourceEntry?.title || run.sourceEntryId}</p>
                  </button>
                </li>
              ))}
              {activeRuns.length === 0 && <li className="text-sm text-zinc-400">No active runs found.</li>}
            </ul>
          </aside>

          <main className="space-y-4">
            {selectedRun ? (
              <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100">{selectedRun.title}</h2>
                    <p className="text-xs text-zinc-400">Running from: {selectedRun.sourceEntry?.title || selectedRun.sourceEntryId}</p>
                  </div>
                  <button
                    onClick={handleSaveRun}
                    disabled={loading}
                    className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    Save Run Progress
                  </button>
                </div>

                <RunLockedView
                  runBody={selectedRun.runBody}
                  initialInteractionState={selectedRun.interactionState || "{}"}
                  onChange={setInteractionState}
                />
              </div>
            ) : (
              <div className="rounded border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">Select an active run.</div>
            )}
          </main>

          <aside className="space-y-4">
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={10}
                placeholder="Run-specific notes"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-100">Utility Timer</h3>
              <p className="mb-3 text-xs text-zinc-400">Standalone timer for this run (outside protocol steps).</p>
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    value={utilityMinutes}
                    onChange={(e) => applyUtilityDuration(parseInt(e.target.value || "0", 10), utilitySeconds)}
                    className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-400">Seconds</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={utilitySeconds}
                    onChange={(e) => applyUtilityDuration(utilityMinutes, parseInt(e.target.value || "0", 10))}
                    className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-center font-mono text-sm text-zinc-100">
                  {formatDuration(utilityTimer.remaining)}
                </span>
                <button
                  onClick={() => setUtilityTimer((prev) => (prev.locked ? prev : { ...prev, running: !prev.running }))}
                  disabled={utilityTimer.locked}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
                >
                  {utilityTimer.running ? "Pause" : "Start"}
                </button>
                <button
                  onClick={() =>
                    setUtilityTimer((prev) => (prev.locked ? prev : { ...prev, running: false, remaining: prev.total }))
                  }
                  disabled={utilityTimer.locked}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200 disabled:opacity-40"
                >
                  Reset
                </button>
                <button
                  onClick={() => setUtilityTimer((prev) => ({ ...prev, running: false, locked: !prev.locked }))}
                  className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
                >
                  {utilityTimer.locked ? "Unlock" : "Lock"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded border border-zinc-800 bg-zinc-900 p-3">
            <h2 className="mb-2 text-lg font-semibold text-zinc-100">Run History</h2>
            <div className="mb-3 space-y-2">
              <input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Search runs"
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-500"
              />
              <select
                value={historySortBy}
                onChange={(e) => setHistorySortBy(e.target.value as SortBy)}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="title">Sort: Run Title</option>
                <option value="protocol">Sort: Protocol</option>
                <option value="status">Sort: Status</option>
              </select>
            </div>
            <ul className="space-y-2">
              {historyRuns.map((run) => (
                <li key={run.id}>
                  <button
                    onClick={() => handleSelectRun(run.id)}
                    className={`w-full rounded border px-3 py-2 text-left ${selectedRun?.id === run.id ? "border-emerald-500 bg-emerald-500/20" : "border-zinc-700 bg-zinc-800"}`}
                  >
                    <p className="text-sm font-semibold text-zinc-100">{run.title}</p>
                    <p className="text-xs text-zinc-400">{run.sourceEntry?.title || run.sourceEntryId}</p>
                    <p className="text-[11px] text-zinc-500">{run.status} • {new Date(run.createdAt).toLocaleString()}</p>
                  </button>
                </li>
              ))}
              {historyRuns.length === 0 && <li className="text-sm text-zinc-400">No run history matches this filter.</li>}
            </ul>
          </aside>

          <main>
            {selectedRun ? (
              <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-zinc-100">{selectedRun.title}</h2>
                  <p className="text-xs text-zinc-400">
                    Locked history • Protocol: {selectedRun.sourceEntry?.title || selectedRun.sourceEntryId}
                  </p>
                </div>

                <RunLockedView
                  runBody={selectedRun.runBody}
                  initialInteractionState={selectedRun.interactionState || "{}"}
                  readOnly={true}
                />

                <div className="mt-4 rounded border border-zinc-800 bg-zinc-950 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Run Notes</p>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">{selectedRun.notes || "No notes captured for this run."}</p>
                </div>
              </div>
            ) : (
              <div className="rounded border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">Select a historical run to view locked details.</div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default function RunsPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-zinc-600">Loading runs...</div>}>
      <RunsPageContent />
    </React.Suspense>
  );
}
