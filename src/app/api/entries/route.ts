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

export async function GET(request: Request) {
  try {
    const actor = getActorFromRequest(request);
    await ensureActor(actor);

    const entries = await prisma.entry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("GET /api/entries failed:", error);
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: "Failed to load entries", detail }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = getActorFromRequest(request);
    await ensureActor(actor);

    const payload = await request.json().catch(() => ({}));
    const created = await prisma.entry.create({
      data: {
        title: payload.title ?? "Untitled",
        description: normalizeDescription(payload.description),
        body: payload.body ?? "",
        authorId: actor.id,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true },
        },
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/entries failed:", error);
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined;
    return NextResponse.json({ error: "Failed to create entry", detail }, { status: 500 });
  }
}
