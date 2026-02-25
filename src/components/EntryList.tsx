"use client";
import React from "react";
import type { Entry } from "@/models/entry";

type Props = {
  entries: Entry[];
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function EntryList({ entries, onSelect, onDelete }: Props) {
  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const fallback = stripHtml(e.body ?? "");
        const summary = (e.description || fallback).slice(0, 100);

        return (
          <li key={e.id} className="rounded border border-zinc-200 bg-white p-2">
            <button onClick={() => onSelect?.(e.id)} className="w-full text-left">
              <p className="truncate text-base font-semibold text-zinc-900">{e.title || "Untitled"}</p>
              <p className="mt-1 text-xs text-zinc-600">{summary || "No description"}</p>
            </button>
            <div className="mt-2 flex justify-end">
              <button onClick={() => onDelete?.(e.id)} className="text-xs text-red-600">
                Delete
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
