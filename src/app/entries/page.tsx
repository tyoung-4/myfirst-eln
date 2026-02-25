"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Editor from "@/components/Editor";
import EntryList from "@/components/EntryList";
import type { Entry } from "@/models/entry";

type CurrentUser = {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
};

const CURRENT_USER: CurrentUser = {
  id: "default-user",
  name: "Default",
  role: "MEMBER",
};

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);

  const authHeaders = useMemo(
    () => ({
      "x-user-id": CURRENT_USER.id,
      "x-user-name": CURRENT_USER.name,
      "x-user-role": CURRENT_USER.role,
    }),
    []
  );
  const jsonHeaders = useMemo(
    () => ({
      ...authHeaders,
      "Content-Type": "application/json",
    }),
    [authHeaders]
  );

  const canEdit = (entry: Entry) => Boolean(entry.authorId && entry.authorId === CURRENT_USER.id);

  const canDelete = (entry: Entry) => {
    if (CURRENT_USER.role === "ADMIN") return true;
    if (CURRENT_USER.name === "Default") return true;
    return Boolean(entry.authorId && entry.authorId === CURRENT_USER.id);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/entries", { headers: authHeaders });
      if (!res.ok) {
        const text = await res.text().catch(() => "<no body>");
        console.error("Failed to load entries:", res.status, text);
        setEntries([]);
      } else {
        const data = (await res.json()) as Entry[];
        setEntries(data);
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

  async function handleEdit(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry || !canEdit(entry)) return;
    await handleSelect(id);
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 p-6">
      <div className="flex items-center justify-between rounded border border-zinc-200 bg-white px-4 py-2">
        <h1 className="text-base font-semibold text-zinc-900">Protocol Entries</h1>
        <p className="text-sm text-zinc-600">
          User: <span className="font-semibold text-zinc-900">{CURRENT_USER.name}</span>
        </p>
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
        <div>
          <EntryList
            entries={entries}
            canEdit={canEdit}
            canDelete={canDelete}
            onSelect={handleSelect}
            onEdit={handleEdit}
            onClone={handleClone}
            onDelete={handleDelete}
          />
        </div>
      </aside>
      <main className="flex-1">
        <h2 className="mb-4 text-xl font-semibold">Editor</h2>
        <Editor
          initial={selected ?? undefined}
          currentAuthorName={CURRENT_USER.name}
          onSave={handleSave}
          onCancel={() => setSelected(null)}
          saving={loading}
        />
        {selected && (
          <div className="mt-6 rounded border p-4">
            <h3 className="text-lg font-medium">Preview</h3>
            <p className="mt-1 text-sm text-zinc-600">{selected.description || "No description"}</p>
            <p className="mt-1 text-xs text-zinc-500">Author: {selected.author?.name || CURRENT_USER.name}</p>
            <div className="prose prose-sm mt-4 max-w-none">
              <p className="text-sm text-zinc-600">
                {typeof selected.body === "string" ? selected.body.slice(0, 300) : "Rich content"}
              </p>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
