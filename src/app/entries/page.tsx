"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Editor from "@/components/Editor";
import EntryList from "@/components/EntryList";
import { TECHNIQUE_OPTIONS, type Entry } from "@/models/entry";

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
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(DEFAULT_USER);
  const [isDirty, setIsDirty] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [techniqueFilter, setTechniqueFilter] = useState("ALL");
  const [authorFilter, setAuthorFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "technique" | "author">("newest");

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
    setSaveError(null);
    try {
      const isUpdate = editorMode === "edit" && Boolean(payload.id);
      const endpoint = isUpdate ? `/api/entries/${payload.id}` : "/api/entries";
      const method = isUpdate ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: jsonHeaders,
        body: JSON.stringify({
          title: payload.title,
          description: payload.description,
          body: payload.body,
          technique: payload.technique,
          authorId: payload.authorId,
        }),
      });

      if (!res.ok) {
        let detail = "";
        try {
          const parsed = await res.json();
          detail = parsed?.error || parsed?.detail || "";
        } catch {
          detail = await res.text().catch(() => "<no body>");
        }
        console.error(`Failed to ${isUpdate ? "update" : "create"} entry:`, res.status, detail);
        setSaveError(`${isUpdate ? "Update" : "Create"} failed (${res.status})${detail ? `: ${detail}` : ""}`);
        return;
      }

      const saved = (await res.json()) as Entry;
      if (isUpdate) {
        setEntries((s) => s.map((e) => (e.id === saved.id ? saved : e)));
      } else {
        setEntries((s) => [saved, ...s]);
      }
      setEditorMode("edit");
      setSelected(saved);
      setIsDirty(false);
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
        let detail = "";
        try {
          const parsed = await res.json();
          detail = parsed?.error || parsed?.detail || "";
        } catch {
          detail = await res.text().catch(() => "<no body>");
        }
        console.error("Failed to delete entry:", res.status, detail);
        setSaveError(`Delete failed (${res.status})${detail ? `: ${detail}` : ""}`);
        return;
      }
      setEntries((s) => s.filter((e) => e.id !== id));
      setSaveError(null);
      if (selected?.id === id) {
        setSelected(null);
        setEditorMode("create");
        setIsDirty(false);
      }
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
        setEditorMode("edit");
        setSelected(data);
        setIsDirty(false);
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
      setEditorMode("edit");
      setIsDirty(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunProtocol() {
    if (!selected) return;

    const shouldRun = window.confirm(`Run Protocol: ${selected.title}?`);
    if (!shouldRun) return;

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

      const run = (await res.json()) as { id: string };
      router.push(`/runs?runId=${run.id}&sourceEntryId=${selected.id}`);
    } finally {
      setLoading(false);
    }
  }

  const authorOptions = useMemo(() => {
    const values = Array.from(new Set(entries.map((entry) => entry.author?.name || "Default")));
    return values.sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      const authorName = entry.author?.name || "Default";
      const technique = entry.technique || "General";
      const matchesTechnique = techniqueFilter === "ALL" || technique === techniqueFilter;
      const matchesAuthor = authorFilter === "ALL" || authorName === authorFilter;
      const matchesKeyword =
        !query ||
        `${entry.title} ${entry.description} ${technique} ${authorName} ${entry.body}`.toLowerCase().includes(query);

      return matchesTechnique && matchesAuthor && matchesKeyword;
    });

    filtered.sort((a, b) => {
      if (sortBy === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === "technique") return (a.technique || "General").localeCompare(b.technique || "General");
      if (sortBy === "author") return (a.author?.name || "Default").localeCompare(b.author?.name || "Default");
      return b.createdAt.localeCompare(a.createdAt);
    });

    return filtered;
  }, [entries, keyword, techniqueFilter, authorFilter, sortBy]);

  const runDisabled = !selected || loading || editorMode !== "edit" || isDirty;

  async function handleEdit(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry || !canEdit(entry)) return;
    await handleSelect(id);
  }

  return (
    <div className="flex min-h-screen flex-col gap-5 p-6">
      <div className="flex items-center justify-between rounded border border-zinc-200 bg-white px-4 py-2">
        <h1 className="text-base font-semibold text-zinc-900">Protocols</h1>
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
              setEditorMode("create");
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
          <h2 className="mb-3 text-lg font-semibold">Protocols</h2>
          <div className="mb-4">
            <button
              onClick={() => {
                setSelected(null);
                setEditorMode("create");
                setSaveError(null);
                setIsDirty(false);
              }}
              className="mb-2 w-full rounded bg-green-600 px-3 py-2 text-sm text-white"
            >
              New Protocol
            </button>
          </div>
          <div className="mb-3 space-y-2 rounded border border-zinc-200 bg-white p-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search keyword"
              className="w-full rounded border border-zinc-300 px-2 py-1 text-xs"
            />
            <select
              value={techniqueFilter}
              onChange={(e) => setTechniqueFilter(e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
            >
              <option value="ALL">All techniques</option>
              {TECHNIQUE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
            >
              <option value="ALL">All authors</option>
              {authorOptions.map((authorName) => (
                <option key={authorName} value={authorName}>
                  {authorName}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "technique" | "author")}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="technique">Sort: Technique</option>
              <option value="author">Sort: Author</option>
            </select>
          </div>
          <EntryList
            entries={filteredEntries}
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
              disabled={runDisabled}
              className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Run Protocol
            </button>
          </div>
          {runDisabled && <p className="-mt-2 mb-3 text-xs text-zinc-500">(save first!)</p>}
          {saveError && (
            <div className="mb-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}
          <Editor
            initial={selected ?? undefined}
            currentAuthorName={currentUser.name}
            onSave={handleSave}
            onCancel={() => {
              setSelected(null);
              setEditorMode("create");
              setIsDirty(false);
            }}
            onDirtyChange={setIsDirty}
            saving={loading}
          />
          {selected && (
            <div className="mt-6 rounded border p-4">
              <h3 className="text-lg font-medium">Preview</h3>
              <p className="mt-1 text-sm text-zinc-600">{selected.description || "No description"}</p>
              <p className="mt-1 text-xs text-zinc-500">Author: {selected.author?.name || currentUser.name}</p>
              <p className="mt-1 text-xs text-zinc-500">Technique: {selected.technique || "General"}</p>
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
