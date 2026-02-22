import { NextResponse } from "next/server";
import type { Entry } from "@/models/entry";
import { newEntry } from "@/models/entry";
import { store } from "@/lib/store";

export async function GET() {
  return NextResponse.json(store.entries);
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const entry: Entry = newEntry(payload);
  store.entries.unshift(entry);
  return NextResponse.json(entry, { status: 201 });
}
