import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../db/client";
import { getOrCreateUserFromAuth } from "../../../../auth/authUser";

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

interface Conclusion {
  id?: string;
  propositionIds: string[];
  sourceNames: string[];
  urls: string[];
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getOrCreateUserFromAuth(request);
    if (result instanceof NextResponse) {
      return result;
    }
    const { id: userId } = result;

    const existingMap = await prisma.argumentMap.findUnique({
      where: { id: params.id },
      include: {
        entities: true,
        conclusions: true,
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

    // Extract entities, conclusions and other data
    const { entities, conclusions, ...restData } = data;

    // Handle entities
    const currentEntityIds = new Set(existingMap.entities.map((e) => e.id));
    const updatedEntityIds = new Set(entities?.map((e: any) => e.id) || []);
    const entityIdsToDelete = Array.from(currentEntityIds).filter(
      (id) => !updatedEntityIds.has(id)
    );

    const formattedEntities = entities?.map((entity: any) => {
      const { id, type, autoVisibility, explicitVisibility, ...entityData } =
        entity;
      return {
        where: { id },
        update: {
          type,
          autoVisibility,
          explicitVisibility,
          data: entityData,
        },
        create: {
          id,
          type,
          autoVisibility,
          explicitVisibility,
          data: entityData,
        },
      };
    });

    // Handle conclusions
    // Helper function to compare conclusions
    const conclusionsAreEqual = (a: Conclusion, b: Conclusion) => {
      const arraysEqual = (arr1: string[], arr2: string[]) =>
        arr1.length === arr2.length &&
        arr1.every((item, index) => item === arr2[index]);

      return arraysEqual(a.propositionIds, b.propositionIds) &&
             arraysEqual(a.sourceNames, b.sourceNames) &&
             arraysEqual(a.urls, b.urls);
    };

    // Find conclusions to delete (those in existing but not in updated)
    const conclusionsToDelete = existingMap.conclusions.filter(existing =>
      !conclusions?.some((updated: Conclusion) => conclusionsAreEqual(existing, updated))
    );

    // Process conclusions for update/create
    const formattedConclusions = conclusions?.map((conclusion: Conclusion) => {
      // Find matching existing conclusion
      const existingConclusion = existingMap.conclusions.find(existing =>
        conclusionsAreEqual(existing, conclusion)
      );

      // If there's a match, use its ID, otherwise use provided ID or let Prisma generate one
      const id = existingConclusion?.id || conclusion.id;

      return {
        where: { id },
        update: {
          propositionIds: conclusion.propositionIds,
          sourceNames: conclusion.sourceNames,
          urls: conclusion.urls,
        },
        create: {
          id,
          propositionIds: conclusion.propositionIds,
          sourceNames: conclusion.sourceNames,
          urls: conclusion.urls,
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
        conclusions: {
          deleteMany: {
            id: { in: conclusionsToDelete.map(c => c.id) },
          },
          upsert: formattedConclusions,
        },
      },
      include: {
        entities: true,
        conclusions: true,
      },
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
    const result = await getOrCreateUserFromAuth(request);
    if (result instanceof NextResponse) {
      return result;
    }
    const { id: userId } = result;

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
