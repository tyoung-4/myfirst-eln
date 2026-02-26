"use client";
import React, { useEffect, useMemo, useState } from "react";
import RichTextEditor from "./RichTextEditor";
import { TECHNIQUE_OPTIONS, type Entry } from "@/models/entry";

type Props = {
  initial?: Partial<Entry>;
  currentAuthorName?: string;
  onSave: (data: Partial<Entry>) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
  saving?: boolean;
};

export default function Editor({
  initial = {},
  currentAuthorName = "Default",
  onSave,
  onDirtyChange,
  onCancel,
  saving = false,
}: Props) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [technique, setTechnique] = useState(initial.technique ?? "General");
  const [body, setBody] = useState(initial.body ?? "");

  useEffect(() => {
    setTitle(initial.title ?? "");
    setDescription(initial.description ?? "");
    setTechnique(initial.technique ?? "General");
    setBody(initial.body ?? "");
  }, [initial.id, initial.title, initial.description, initial.technique, initial.body]);

  const isDirty = useMemo(() => {
    return (
      title !== (initial.title ?? "") ||
      description !== (initial.description ?? "") ||
      technique !== (initial.technique ?? "General") ||
      body !== (initial.body ?? "")
    );
  }, [title, description, technique, body, initial.title, initial.description, initial.technique, initial.body]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-4 rounded border border-zinc-800 bg-zinc-900 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Entry Metadata</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry name"
          className="mb-3 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-xl font-semibold text-zinc-100 placeholder:text-zinc-500"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 100))}
          placeholder="Short description (max 100 characters)"
          maxLength={100}
          rows={2}
          className="w-full resize-none rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500"
        />
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-zinc-400">Technique</label>
          <select
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            {TECHNIQUE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 rounded border bg-zinc-800 px-3 py-2">
          <p className="text-xs font-medium text-zinc-400">Author</p>
          <p className="text-sm text-zinc-100">{initial.author?.name || currentAuthorName || "Default"}</p>
        </div>
        <p className="mt-1 text-right text-xs text-zinc-400">{description.length}/100</p>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">Protocol / Entry Body</label>
        <RichTextEditor
          key={initial.id ?? "new-entry"}
          initialContent={initial.body ?? ""}
          onChange={(content) => setBody(content)}
          editable={true}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() =>
            onSave({
              id: initial.id,
              title: title || initial.title || "",
              description: description.slice(0, 100),
              technique,
              body: body || initial.body || "",
            })
          }
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-60"
        >
          Save
        </button>
        <button onClick={onCancel} className="rounded border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-200 hover:bg-zinc-800">
          Cancel
        </button>
      </div>
    </div>
  );
}
