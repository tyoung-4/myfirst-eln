"use client";
import React, { useEffect, useState } from "react";
import Editor from "@/components/Editor";
import EntryList from "@/components/EntryList";
import type { Entry } from "@/models/entry";

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/entries");
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
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(payload: Partial<Entry>) {
    setLoading(true);
    try {
      const isUpdate = Boolean(payload.id);
      const endpoint = isUpdate ? `/api/entries/${payload.id}` : "/api/entries";
      const method = isUpdate ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: payload.title, body: payload.body, authorId: payload.authorId }),
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
    setLoading(true);
    try {
      await fetch(`/api/entries/${id}`, { method: "DELETE" });
      setEntries((s) => s.filter((e) => e.id !== id));
      if (selected?.id === id) setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries/${id}`);
      if (res.ok) {
        const data = (await res.json()) as Entry;
        setSelected(data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen gap-8 p-8">
      <aside className="w-80">
        <h2 className="mb-4 text-xl font-semibold">Entries</h2>
        <div className="mb-4">
          <button
            onClick={() => setSelected(null)}
            className="mb-2 w-full rounded bg-green-600 px-3 py-2 text-white"
          >
            New Entry
          </button>
        </div>
        <div>
          <EntryList entries={entries} onSelect={handleSelect} onDelete={handleDelete} />
        </div>
      </aside>
      <main className="flex-1">
        <h2 className="mb-4 text-xl font-semibold">Editor</h2>
        <Editor
          initial={selected ?? undefined}
          onSave={handleSave}
          onCancel={() => setSelected(null)}
          saving={loading}
        />
        {selected && (
          <div className="mt-6 rounded border p-4">
            <h3 className="text-lg font-medium">Preview</h3>
            <div className="prose prose-sm mt-4 max-w-none">
              <p className="text-sm text-zinc-600">
                {typeof selected.body === "string" ? selected.body.slice(0, 300) : "Rich content"}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
