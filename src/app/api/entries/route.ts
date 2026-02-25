import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const entries = await prisma.entry.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("GET /api/entries failed:", error);
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: "Failed to load entries", detail }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const created = await prisma.entry.create({
      data: {
        title: payload.title ?? "Untitled",
        body: payload.body ?? "",
        authorId: payload.authorId ?? null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/entries failed:", error);
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: "Failed to create entry", detail }, { status: 500 });
  }
}
