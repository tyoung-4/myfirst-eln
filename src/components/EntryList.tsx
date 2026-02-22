"use client";
import React from "react";
import type { Entry } from "@/models/entry";

type Props = {
  entries: Entry[];
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export default function EntryList({ entries, onSelect, onDelete }: Props) {
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li key={e.id} className="overflow-hidden rounded border p-3">
          <div className="flex items-start justify-between">
            <div>
              <button onClick={() => onSelect?.(e.id)} className="text-left text-lg font-medium">
                {e.title}
              </button>
              <p className="mt-1 text-sm text-zinc-600">{e.body?.slice(0, 200)}</p>
            </div>
            <div className="ml-4 flex flex-col gap-2">
              <button onClick={() => onSelect?.(e.id)} className="text-sm">
                Open
              </button>
              <button onClick={() => onDelete?.(e.id)} className="text-sm text-red-600">
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
