"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ProtocolRun } from "@/models/protocolRun";
import RunLockedView from "@/components/RunLockedView";

type CurrentUser = {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
};

type InteractionState = {
  stepCompletion: Record<string, boolean>;
  entryFields: Record<string, string>;
  timers: Record<string, { total: number; remaining: number; running: boolean }>;
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

function RunsPageContent() {
  const searchParams = useSearchParams();
  const initialRunId = searchParams.get("runId");

  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEFAULT_USER);
  const [runs, setRuns] = useState<ProtocolRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ProtocolRun | null>(null);
  const [interactionState, setInteractionState] = useState<InteractionState | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

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
        setSelectedRun(null);
        setInteractionState(null);
        setNotes("");
        return;
      }

      const preferred = (initialRunId && data.find((run) => run.id === initialRunId)) || data[0];
      setSelectedRun(preferred);
      try {
        setInteractionState(JSON.parse(preferred.interactionState || "{}"));
      } catch {
        setInteractionState({ stepCompletion: {}, entryFields: {}, timers: {} });
      }
      setNotes(preferred.notes || "");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, initialRunId]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

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
      setSelectedRun(run);
      try {
        setInteractionState(JSON.parse(run.interactionState || "{}"));
      } catch {
        setInteractionState({ stepCompletion: {}, entryFields: {}, timers: {} });
      }
      setNotes(run.notes || "");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRun() {
    if (!selectedRun || !interactionState) return;

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
      setSelectedRun(updated);
      setRuns((prev) => prev.map((run) => (run.id === updated.id ? updated : run)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 p-6">
      <div className="flex items-center justify-between rounded border border-zinc-200 bg-white px-4 py-2">
        <h1 className="text-base font-semibold text-zinc-900">Protocol Runs</h1>
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <span>
            User: <span className="font-semibold text-zinc-900">{currentUser.name}</span>
          </span>
          <select
            value={currentUser.role}
            onChange={(e) => {
              const next = e.target.value === "ADMIN" ? ADMIN_USER : DEFAULT_USER;
              setCurrentUser(next);
              setSelectedRun(null);
            }}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
          >
            <option value="MEMBER">Login as Default</option>
            <option value="ADMIN">Login as Admin</option>
          </select>
        </div>
      </div>

      <div className="flex gap-5">
        <aside className="w-80 shrink-0 rounded border border-zinc-200 bg-white p-3">
          <h2 className="mb-2 text-lg font-semibold">Runs</h2>
          <ul className="space-y-2">
            {runs.map((run) => (
              <li key={run.id}>
                <button
                  onClick={() => handleSelectRun(run.id)}
                  className={`w-full rounded border px-3 py-2 text-left ${selectedRun?.id === run.id ? "border-indigo-500 bg-indigo-50" : "border-zinc-200 bg-zinc-50"}`}
                >
                  <p className="text-sm font-semibold text-zinc-900">{run.title}</p>
                  <p className="text-xs text-zinc-600">{run.sourceEntry?.title || run.sourceEntryId}</p>
                </button>
              </li>
            ))}
            {runs.length === 0 && <li className="text-sm text-zinc-500">No runs yet.</li>}
          </ul>
        </aside>

        <main className="flex-1 space-y-4">
          {selectedRun ? (
            <>
              <div className="rounded border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedRun.title}</h2>
                    <p className="text-xs text-zinc-500">Locked run from: {selectedRun.sourceEntry?.title || selectedRun.sourceEntryId}</p>
                  </div>
                  <button
                    onClick={handleSaveRun}
                    disabled={loading || !interactionState}
                    className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    Save Run Progress
                  </button>
                </div>

                <RunLockedView
                  runBody={selectedRun.runBody}
                  initialInteractionState={JSON.stringify(interactionState ?? {})}
                  onChange={setInteractionState}
                />
              </div>

              <div className="rounded border border-zinc-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-semibold">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Run-specific notes"
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : (
            <div className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-600">Select a run to begin.</div>
          )}
        </main>
      </div>
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
