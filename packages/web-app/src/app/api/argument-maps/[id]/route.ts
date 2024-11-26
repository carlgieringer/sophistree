import { NextRequest, NextResponse } from "next/server";

import prismaPromise from "../../../../db/client";
import { getOrCreateUserFromAuth } from "../../../../auth/authUser";
import { Entity } from "@sophistree/common";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const prisma = await prismaPromise;
    const map = await prisma.argumentMap.findUnique({
      where: { id: params.id },
      include: {
        entities: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    const entities = map.entities.flatMap(({ id, data }) => {
      if (!data || typeof data !== "object") {
        console.error("Invalid entity data", { data });
        return [];
      }
      return { ...data, id } as Entity;
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
    const { entities, name } = data;

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
          explicitVisibility,
          data: { id, type, explicitVisibility, ...entityData },
        },
        create: {
          id,
          type,
          explicitVisibility,
          data: { id, type, explicitVisibility, ...entityData },
        },
      };
    });

    const map = await prisma.argumentMap.update({
      where: { id: params.id },
      data: {
        name,
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
