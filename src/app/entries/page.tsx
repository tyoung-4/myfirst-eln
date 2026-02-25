"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Editor from "@/components/Editor";
import EntryList from "@/components/EntryList";
import type { Entry } from "@/models/entry";
import type { ProtocolRun } from "@/models/protocolRun";

type CurrentUser = {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
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

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [runs, setRuns] = useState<ProtocolRun[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEFAULT_USER);

  const authHeaders = useMemo(
    () => ({
      "x-user-id": currentUser.id,
      "x-user-name": currentUser.name,
      "x-user-role": currentUser.role,
    }),
    [currentUser]
  );

  const jsonHeaders = useMemo(
    () => ({
      ...authHeaders,
      "Content-Type": "application/json",
    }),
    [authHeaders]
  );

  const canEdit = (entry: Entry) => {
    if (currentUser.role === "ADMIN") return true;
    if (currentUser.name === "Default" && (entry.authorId === "default-user" || entry.authorId === "default-default")) {
      return true;
    }
    return Boolean(entry.authorId && entry.authorId === currentUser.id);
  };

  const canDelete = (entry: Entry) => {
    if (currentUser.role === "ADMIN") return true;
    if (currentUser.name === "Default" && (entry.authorId === "default-user" || entry.authorId === "default-default")) {
      return true;
    }
    return Boolean(entry.authorId && entry.authorId === currentUser.id);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, runsRes] = await Promise.all([
        fetch("/api/entries", { headers: authHeaders }),
        fetch("/api/protocol-runs", { headers: authHeaders }),
      ]);

      if (!entriesRes.ok) {
        const text = await entriesRes.text().catch(() => "<no body>");
        console.error("Failed to load entries:", entriesRes.status, text);
        setEntries([]);
      } else {
        const entriesData = (await entriesRes.json()) as Entry[];
        setEntries(entriesData);
      }

      if (!runsRes.ok) {
        const text = await runsRes.text().catch(() => "<no body>");
        console.error("Failed to load runs:", runsRes.status, text);
        setRuns([]);
      } else {
        const runsData = (await runsRes.json()) as ProtocolRun[];
        setRuns(runsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(payload: Partial<Entry>) {
    setLoading(true);
    try {
      const isUpdate = Boolean(payload.id);
      const endpoint = isUpdate ? `/api/entries/${payload.id}` : "/api/entries";
      const method = isUpdate ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: jsonHeaders,
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          body: payload.body,
          authorId: payload.authorId,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error(`Failed to ${isUpdate ? "update" : "create"} entry:`, res.status, text);
        throw new Error(`${isUpdate ? "Update" : "Create"} failed`);
      }

      const saved = (await res.json()) as Entry;
      if (isUpdate) {
        setEntries((s) => s.map((e) => (e.id === saved.id ? saved : e)));
      } else {
        setEntries((s) => [saved, ...s]);
      }
      setSelected(saved);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry || !canDelete(entry)) return;

    const firstCheck = window.confirm(
      "Are you sure you want to delete this entry? It cannot be recovered once deleted."
    );
    if (!firstCheck) return;

    const secondCheck = window.confirm("Please confirm again that you want to permanently delete this entry.");
    if (!secondCheck) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error("Failed to delete entry:", res.status, text);
        return;
      }
      setEntries((s) => s.filter((e) => e.id !== id));
      if (selected?.id === id) setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries/${id}`, { headers: authHeaders });
      if (res.ok) {
        const data = (await res.json()) as Entry;
        setSelected(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleClone(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error("Failed to clone entry:", res.status, text);
        return;
      }
      const cloned = (await res.json()) as Entry;
      setEntries((s) => [cloned, ...s]);
      setSelected(cloned);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunProtocol() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/protocol-runs", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ sourceEntryId: selected.id }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error("Failed to create protocol run:", res.status, text);
        return;
      }

      const created = (await res.json()) as ProtocolRun;
      setRuns((s) => [created, ...s]);
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry || !canEdit(entry)) return;
    await handleSelect(id);
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 p-6">
      <div className="flex items-center justify-between rounded border border-zinc-200 bg-white px-4 py-2">
        <h1 className="text-base font-semibold text-zinc-900">Protocol Entries</h1>
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <span>
            User: <span className="font-semibold text-zinc-900">{currentUser.name}</span>
          </span>
          <select
            value={currentUser.role}
            onChange={(e) => {
              const next = e.target.value === "ADMIN" ? ADMIN_USER : DEFAULT_USER;
              setCurrentUser(next);
              setSelected(null);
            }}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700"
          >
            <option value="MEMBER">Login as Default</option>
            <option value="ADMIN">Login as Admin</option>
          </select>
        </div>
      </div>

      <div className="flex gap-5">
        <aside className="w-64 shrink-0">
          <h2 className="mb-3 text-lg font-semibold">Entries</h2>
          <div className="mb-4">
            <button
              onClick={() => setSelected(null)}
              className="mb-2 w-full rounded bg-green-600 px-3 py-2 text-sm text-white"
            >
              New Entry
            </button>
          </div>
          <EntryList
            entries={entries}
            canEdit={canEdit}
            canDelete={canDelete}
            onSelect={handleSelect}
            onEdit={handleEdit}
            onClone={handleClone}
            onDelete={handleDelete}
          />
        </aside>

        <main className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Editor</h2>
            <button
              onClick={handleRunProtocol}
              disabled={!selected || loading}
              className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Run Protocol
            </button>
          </div>

          <Editor
            initial={selected ?? undefined}
            currentAuthorName={currentUser.name}
            onSave={handleSave}
            onCancel={() => setSelected(null)}
            saving={loading}
          />

          {selected && (
            <div className="mt-6 rounded border p-4">
              <h3 className="text-lg font-medium">Preview</h3>
              <p className="mt-1 text-sm text-zinc-600">{selected.description || "No description"}</p>
              <p className="mt-1 text-xs text-zinc-500">Author: {selected.author?.name || currentUser.name}</p>
              <div className="prose prose-sm mt-4 max-w-none">
                <p className="text-sm text-zinc-600">
                  {typeof selected.body === "string" ? selected.body.slice(0, 300) : "Rich content"}
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 rounded border p-4">
            <h3 className="text-lg font-semibold">Protocol Runs (Backbone)</h3>
            <p className="mb-3 text-xs text-zinc-500">Runs are stored separately and start as locked clones.</p>
            <ul className="space-y-2">
              {runs.map((run) => (
                <li key={run.id} className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-sm font-semibold text-zinc-900">{run.title}</p>
                  <p className="text-xs text-zinc-600">
                    Source: {run.sourceEntry?.title || run.sourceEntryId} | Runner: {run.runner?.name || "Unknown"} | Status: {run.status}
                  </p>
                </li>
              ))}
              {runs.length === 0 && <li className="text-sm text-zinc-500">No runs created yet.</li>}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
