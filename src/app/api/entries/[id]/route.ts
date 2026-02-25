import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function normalizeDescription(value: unknown): string {
  return String(value ?? "").trim().slice(0, 100);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const found = await prisma.entry.findUnique({ where: { id: params.id } });
    if (!found) return new NextResponse(null, { status: 404 });
    return NextResponse.json(found);
  } catch (error) {
    console.error(`GET /api/entries/${params.id} failed:`, error);
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: "Failed to load entry", detail }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const payload = await request.json().catch(() => ({}));
  try {
    const updated = await prisma.entry.update({
      where: { id: params.id },
      data: {
        title: payload.title,
        description: normalizeDescription(payload.description),
        body: payload.body,
        // increment version on update
        version: { increment: 1 },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    const isMissing = typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
    if (isMissing) return new NextResponse(null, { status: 404 });
    console.error(`PUT /api/entries/${params.id} failed:`, error);
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: "Failed to update entry", detail }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.entry.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const isMissing = typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
    if (isMissing) return new NextResponse(null, { status: 404 });
    console.error(`DELETE /api/entries/${params.id} failed:`, error);
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: "Failed to delete entry", detail }, { status: 500 });
  }
}
