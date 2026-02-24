import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const entries = await prisma.entry.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const created = await prisma.entry.create({
    data: {
      title: payload.title ?? "Untitled",
      body: payload.body ?? "",
      authorId: payload.authorId ?? null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
