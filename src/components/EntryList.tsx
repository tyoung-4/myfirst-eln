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
        const editable = canEdit(e);
        const deletable = canDelete(e);

        return (
          <li key={e.id} className="rounded border border-zinc-200 bg-white p-2">
            <button onClick={() => onSelect?.(e.id)} className="w-full text-left">
              <p className="truncate text-base font-semibold text-zinc-900">{e.title || "Untitled"}</p>
              <p className="mt-1 text-xs text-zinc-600">{summary || "No description"}</p>
              <p className="mt-1 text-[11px] text-zinc-500">Author: {authorName}</p>
            </button>
            <div className="mt-2 grid grid-cols-3 gap-1">
              <button
                onClick={() => onEdit?.(e.id)}
                disabled={!editable}
                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Edit
              </button>
              <button
                onClick={() => onClone?.(e.id)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
              >
                Clone
              </button>
              <button
                onClick={() => onDelete?.(e.id)}
                disabled={!deletable}
                className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
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
