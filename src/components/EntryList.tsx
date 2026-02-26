"use client";
import React from "react";
import type { Entry } from "@/models/entry";

type Props = {
  entries: Entry[];
  canEdit: (entry: Entry) => boolean;
  canDelete: (entry: Entry) => boolean;
  onSelect?: (id: string) => void;
  onEdit?: (id: string) => void;
  onClone?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function EntryList({ entries, canEdit, canDelete, onSelect, onEdit, onClone, onDelete }: Props) {
  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const fallback = stripHtml(e.body ?? "");
        const summary = (e.description || fallback).slice(0, 100);
        const authorName = e.author?.name || "Default";
        const technique = e.technique || "General";
        const editable = canEdit(e);
        const deletable = canDelete(e);

        return (
          <li key={e.id} className="rounded border border-zinc-800 bg-zinc-900 p-2">
            <button onClick={() => onSelect?.(e.id)} className="w-full text-left">
              <p className="truncate text-base font-semibold text-zinc-100">{e.title || "Untitled"}</p>
              <p className="mt-1 text-xs text-zinc-300">{summary || "No description"}</p>
              <p className="mt-1 text-[11px] text-zinc-400">Author: {authorName}</p>
              <p className="text-[11px] text-zinc-400">Technique: {technique}</p>
            </button>
            <div className="mt-2 grid grid-cols-3 gap-1">
              <button
                onClick={() => onEdit?.(e.id)}
                disabled={!editable}
                className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Edit
              </button>
              <button
                onClick={() => onClone?.(e.id)}
                className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200"
              >
                Clone
              </button>
              <button
                onClick={() => onDelete?.(e.id)}
                disabled={!deletable}
                className="rounded border border-red-500/50 px-2 py-1 text-xs text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
