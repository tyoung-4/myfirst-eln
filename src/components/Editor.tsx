"use client";
import React, { useState } from "react";
import type { Entry } from "@/models/entry";

type Props = {
  initial?: Partial<Entry>;
  onSave: (data: Partial<Entry>) => void;
  onCancel?: () => void;
  saving?: boolean;
};

export default function Editor({ initial = {}, onSave, onCancel, saving = false }: Props) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [body, setBody] = useState(initial.body ?? "");

  return (
    <div className="w-full max-w-2xl">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mb-2 w-full rounded border px-3 py-2"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your notes (markdown supported)..."
        className="mb-3 h-48 w-full rounded border px-3 py-2"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ title, body })}
          disabled={saving}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          Save
        </button>
        <button onClick={onCancel} className="rounded px-4 py-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
