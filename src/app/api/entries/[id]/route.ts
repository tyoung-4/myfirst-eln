import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const found = await prisma.entry.findUnique({ where: { id: params.id } });
  if (!found) return new NextResponse(null, { status: 404 });
  return NextResponse.json(found);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const payload = await request.json().catch(() => ({}));
  try {
    const updated = await prisma.entry.update({
      where: { id: params.id },
      data: {
        title: payload.title,
        body: payload.body,
        // increment version on update
        version: { increment: 1 } as any,
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return new NextResponse(null, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.entry.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return new NextResponse(null, { status: 404 });
  }
}
