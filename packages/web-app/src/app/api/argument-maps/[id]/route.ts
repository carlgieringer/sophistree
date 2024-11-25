import { NextRequest, NextResponse } from "next/server";

import prismaPromise from "../../../../db/client";
import { getOrCreateUserFromAuth } from "../../../../auth/authUser";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const prisma = await prismaPromise;
    const map = await prisma.argumentMap.findUnique({
      where: { id: params.id },
      include: {
        entities: true,
      },
    });

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    const entities = map.entities.map(({ id, data }) => {
      if (typeof data !== "object") {
        console.error("Invalid entity data", { data });
        return data;
      }
      return { ...data, id };
    });

    return NextResponse.json({ ...map, entities });
  } catch (error) {
    console.error("Error fetching map:", error);
    return NextResponse.json({ error: "Failed to fetch map" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const result = await getOrCreateUserFromAuth(request);
    if (result instanceof NextResponse) {
      return result;
    }
    const { id: userId } = result;

    const prisma = await prismaPromise;
    const existingMap = await prisma.argumentMap.findUnique({
      where: { id: params.id },
      include: {
        entities: true,
      },
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

    // Extract entities and other data
    const { entities, ...restData } = data;

    // Handle entities
    const currentEntityIds = new Set(existingMap.entities.map((e) => e.id));
    const updatedEntityIds = new Set(entities?.map((e: any) => e.id) || []);
    const entityIdsToDelete = Array.from(currentEntityIds).filter(
      (id) => !updatedEntityIds.has(id),
    );

    const formattedEntities = entities?.map((entity: any) => {
      const { id, type, explicitVisibility, ...entityData } = entity;
      return {
        where: { id },
        update: {
          type,
          explicitVisibility,
          data: entityData,
        },
        create: {
          id,
          type,
          explicitVisibility,
          data: entityData,
        },
      };
    });

    const map = await prisma.argumentMap.update({
      where: { id: params.id },
      data: {
        ...restData,
        entities: {
          deleteMany:
            entityIdsToDelete.length > 0
              ? {
                  id: { in: entityIdsToDelete },
                }
              : undefined,
          upsert: formattedEntities,
        },
      },
      include: {
        entities: true,
      },
    });

    return NextResponse.json(map);
  } catch (error) {
    console.error("Error updating map:", error);
    return NextResponse.json(
      { error: "Failed to update map" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const result = await getOrCreateUserFromAuth(request);
    if (result instanceof NextResponse) {
      return result;
    }
    const { id: userId } = result;

    const prisma = await prismaPromise;
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
      { status: 500 },
    );
  }
}
