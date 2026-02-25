"use client";
import React, { useState } from "react";
import RichTextEditor from "./RichTextEditor";
import type { Entry } from "@/models/entry";

type Props = {
  initial?: Partial<Entry>;
  onSave: (data: Partial<Entry>) => void;
  onCancel?: () => void;
  saving?: boolean;
};

export default function Editor({ initial = {}, onSave, onCancel, saving = false }: Props) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [body, setBody] = useState(initial.body ?? "");

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-4 rounded border bg-zinc-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Entry Metadata</p>
        <input
          key={`title-${initial.id ?? "new"}`}
          defaultValue={initial.title ?? ""}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry name"
          className="mb-3 w-full rounded border bg-white px-3 py-2 text-xl font-semibold"
        />
        <textarea
          key={`description-${initial.id ?? "new"}`}
          defaultValue={initial.description ?? ""}
          onChange={(e) => setDescription(e.target.value.slice(0, 100))}
          placeholder="Short description (max 100 characters)"
          maxLength={100}
          rows={2}
          className="w-full resize-none rounded border bg-white px-3 py-2 text-sm text-zinc-700"
        />
        <p className="mt-1 text-right text-xs text-zinc-500">{(description || initial.description || "").length}/100</p>
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
              description: (description || initial.description || "").slice(0, 100),
              body: body || initial.body || "",
            })
          }
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          Save
        </button>
        <button onClick={onCancel} className="rounded border px-4 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
