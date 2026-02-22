import { NextResponse } from "next/server";
import type { Entry } from "@/models/entry";
import { store } from "@/lib/store";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const found = store.entries.find((e) => e.id === params.id);
  if (!found) return new NextResponse(null, { status: 404 });
  return NextResponse.json(found);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const payload = await request.json().catch(() => ({}));
  const idx = store.entries.findIndex((e) => e.id === params.id);
  if (idx === -1) return new NextResponse(null, { status: 404 });
  const updated: Entry = {
    ...store.entries[idx],
    ...payload,
    updatedAt: new Date().toISOString(),
    version: (store.entries[idx].version ?? 1) + 1,
  };
  store.entries[idx] = updated;
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const idx = store.entries.findIndex((e) => e.id === params.id);
  if (idx === -1) return new NextResponse(null, { status: 404 });
  store.entries.splice(idx, 1);
  return new NextResponse(null, { status: 204 });
}
