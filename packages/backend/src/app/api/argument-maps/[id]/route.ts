import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../db/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const map = await prisma.argumentMap.findUnique({
      where: { id: params.id },
      include: {
        entities: true,
        conclusions: true,
      },
    });

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    return NextResponse.json(map);
  } catch (error) {
    console.error("Error fetching map:", error);
    return NextResponse.json({ error: "Failed to fetch map" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingMap = await prisma.argumentMap.findUnique({
      where: { id: params.id },
    });

    if (!existingMap) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    if (existingMap.userId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ error: "Data is required" }, { status: 400 });
    }

    const map = await prisma.argumentMap.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(map);
  } catch (error) {
    console.error("Error updating map:", error);
    return NextResponse.json(
      { error: "Failed to update map" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const map = await prisma.argumentMap.findUnique({
      where: { id: params.id },
    });

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    if (map.userId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Delete related records first
    await prisma.conclusion.deleteMany({
      where: { mapId: params.id },
    });
    await prisma.entity.deleteMany({
      where: { mapId: params.id },
    });
    await prisma.argumentMap.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting map:", error);
    return NextResponse.json(
      { error: "Failed to delete map" },
      { status: 500 }
    );
  }
}
