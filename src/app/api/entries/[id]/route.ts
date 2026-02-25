import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type Actor = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
};

function normalizeDescription(value: unknown): string {
  return String(value ?? "").trim().slice(0, 100);
}

function getActorFromRequest(request?: Request): Actor {
  const headerId = request?.headers.get("x-user-id")?.trim();
  const headerName = request?.headers.get("x-user-name")?.trim();
  const headerRole = request?.headers.get("x-user-role")?.trim().toUpperCase();

  const name = headerName || "Default";
  const safeId = headerId || `default-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "user"}`;
  const role: "ADMIN" | "MEMBER" = headerRole === "ADMIN" ? "ADMIN" : "MEMBER";

  return {
    id: safeId,
    name,
    email: `${safeId}@local.eln`,
    role,
  };
}

async function ensureActor(actor: Actor) {
  return prisma.user.upsert({
    where: { id: actor.id },
    create: {
      id: actor.id,
      name: actor.name,
      email: actor.email,
      role: actor.role,
    },
    update: {
      name: actor.name,
      role: actor.role,
    },
  });
}

function canModifyEntry(actor: Actor, authorId: string | null): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.name === "Default") return true;
  return Boolean(authorId && actor.id === authorId);
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const actor = getActorFromRequest(request);
    await ensureActor(actor);

    const found = await prisma.entry.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

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
    const actor = getActorFromRequest(request);
    await ensureActor(actor);

    const existing = await prisma.entry.findUnique({ where: { id: params.id }, select: { authorId: true } });
    if (!existing) return new NextResponse(null, { status: 404 });
    if (!canModifyEntry(actor, existing.authorId)) {
      return NextResponse.json({ error: "Not allowed to edit this entry" }, { status: 403 });
    }

    const updated = await prisma.entry.update({
      where: { id: params.id },
      data: {
        title: payload.title,
        description: normalizeDescription(payload.description),
        body: payload.body,
        version: { increment: 1 },
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const actor = getActorFromRequest(request);
    await ensureActor(actor);

    const existing = await prisma.entry.findUnique({ where: { id: params.id }, select: { authorId: true } });
    if (!existing) return new NextResponse(null, { status: 404 });
    if (!canModifyEntry(actor, existing.authorId)) {
      return NextResponse.json({ error: "Not allowed to delete this entry" }, { status: 403 });
    }

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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const actor = getActorFromRequest(request);
    await ensureActor(actor);

    const source = await prisma.entry.findUnique({ where: { id: params.id } });
    if (!source) return new NextResponse(null, { status: 404 });

    const cloned = await prisma.entry.create({
      data: {
        title: `${source.title} (Clone)`,
        description: source.description,
        body: source.body,
        authorId: actor.id,
        version: 1,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(cloned, { status: 201 });
  } catch (error) {
    console.error(`POST /api/entries/${params.id} clone failed:`, error);
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: "Failed to clone entry", detail }, { status: 500 });
  }
}
