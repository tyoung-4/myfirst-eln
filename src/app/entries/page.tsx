"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Editor from "@/components/Editor";
import EntryList from "@/components/EntryList";
import AppTopNav from "@/components/AppTopNav";
import { Q5_TEMPLATE_ENTRY_ID } from "@/lib/defaultTemplates";
import { TECHNIQUE_OPTIONS, type Entry } from "@/models/entry";

type CurrentUser = {
  id: string;
  name: string;
  role: "ADMIN" | "MEMBER";
};

const FINN_USER: CurrentUser = {
  id: "finn-user",
  name: "Finn",
  role: "MEMBER",
};
const JAKE_USER: CurrentUser = {
  id: "jake-user",
  name: "Jake",
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
  const [currentUser, setCurrentUser] = useState<CurrentUser>(FINN_USER);
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
    if (entry.id === Q5_TEMPLATE_ENTRY_ID) return false;
    if (currentUser.role === "ADMIN") return true;
    return Boolean(entry.authorId && entry.authorId === currentUser.id);
  };

  const canDelete = (entry: Entry) => {
    if (entry.id === Q5_TEMPLATE_ENTRY_ID) return false;
    if (currentUser.role === "ADMIN") return true;
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
    if (payload.id === Q5_TEMPLATE_ENTRY_ID) {
      setSaveError("This template is permanent. Clone it first to create an editable copy.");
      return;
    }
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
        if (res.status === 409) {
          console.warn("Delete blocked by related runs:", detail);
          setSaveError(detail || "Cannot delete this protocol because related runs exist.");
        } else {
          console.error("Failed to delete entry:", res.status, detail);
          setSaveError(`Delete failed (${res.status})${detail ? `: ${detail}` : ""}`);
        }
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
    const values = Array.from(new Set(entries.map((entry) => entry.author?.name || "Unknown")));
    return values.sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      const authorName = entry.author?.name || "Unknown";
      const technique = entry.technique || "General";
      const matchesTechnique = techniqueFilter === "ALL" || technique === techniqueFilter;
      const matchesAuthor = authorFilter === "ALL" || authorName === authorFilter;
      const matchesKeyword =
        !query ||
        `${entry.title} ${entry.description} ${technique} ${authorName} ${entry.body}`.toLowerCase().includes(query);

      return matchesTechnique && matchesAuthor && matchesKeyword;
    });

    filtered.sort((a, b) => {
      if (a.id === Q5_TEMPLATE_ENTRY_ID) return -1;
      if (b.id === Q5_TEMPLATE_ENTRY_ID) return 1;
      if (sortBy === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === "technique") return (a.technique || "General").localeCompare(b.technique || "General");
      if (sortBy === "author") return (a.author?.name || "Unknown").localeCompare(b.author?.name || "Unknown");
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
    <div className="flex min-h-screen flex-col gap-5 bg-zinc-950 p-6 text-zinc-100">
      <AppTopNav />
      <div className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-4 py-2">
        <h1 className="text-base font-semibold text-zinc-100">Protocols</h1>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span>
            User: <span className="font-semibold text-zinc-100">{currentUser.name}</span>
          </span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const next = e.target.value === "admin-user" ? ADMIN_USER : e.target.value === "jake-user" ? JAKE_USER : FINN_USER;
              setCurrentUser(next);
              setSelected(null);
              setEditorMode("create");
            }}
            className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
          >
            <option value="finn-user">Login as Finn</option>
            <option value="jake-user">Login as Jake</option>
            <option value="admin-user">Login as Admin</option>
          </select>
        </div>
      </div>
      <div className="flex gap-5">
        <aside className="w-64 shrink-0">
          <h2 className="mb-3 text-lg font-semibold text-zinc-100">Protocols</h2>
          <div className="mb-4">
            <button
              onClick={() => {
                setSelected(null);
                setEditorMode("create");
                setSaveError(null);
                setIsDirty(false);
              }}
              className="mb-2 w-full rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
            >
              New Protocol
            </button>
          </div>
          <div className="mb-3 space-y-2 rounded border border-zinc-800 bg-zinc-900 p-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search keyword"
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-500"
            />
            <select
              value={techniqueFilter}
              onChange={(e) => setTechniqueFilter(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
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
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
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
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100"
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
            <h2 className="text-xl font-semibold text-zinc-100">Editor</h2>
            <button
              onClick={handleRunProtocol}
              disabled={runDisabled}
              className="rounded bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Run Protocol
            </button>
          </div>
          {runDisabled && <p className="-mt-2 mb-3 text-xs text-zinc-400">(save first!)</p>}
          {saveError && (
            <div className="mb-3 rounded border border-red-500/40 bg-red-950/50 px-3 py-2 text-sm text-red-200">
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
            <div className="mt-6 rounded border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="text-lg font-medium text-zinc-100">
                Preview
                {selected.id === Q5_TEMPLATE_ENTRY_ID && (
                  <span className="ml-2 rounded border border-emerald-500/60 bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                    Permanent Template
                  </span>
                )}
              </h3>
              <p className="mt-1 text-sm text-zinc-300">{selected.description || "No description"}</p>
              <p className="mt-1 text-xs text-zinc-400">Author: {selected.author?.name || currentUser.name}</p>
              <p className="mt-1 text-xs text-zinc-400">Technique: {selected.technique || "General"}</p>
              <div className="prose prose-sm mt-4 max-w-none">
                <p className="text-sm text-zinc-300">
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
