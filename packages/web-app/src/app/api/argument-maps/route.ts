import { NextRequest, NextResponse } from "next/server";
import prismaPromise from "../../../db/client";
import { getOrCreateUserFromAuth } from "../../../auth/authUser";

export async function GET(request: NextRequest) {
  try {
    const prisma = await prismaPromise;
    const maps = await prisma.argumentMap.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(maps);
  } catch (error) {
    console.error("Error fetching maps:", error);
    return NextResponse.json(
      { error: "Failed to fetch maps" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await getOrCreateUserFromAuth(request);
    if (result instanceof NextResponse) {
      return result;
    }
    const { id: userId } = result;

    const body = await request.json();
    const { data } = body;

    // Transform the entities and conclusions data to match Prisma's expected format
    const transformedData = {
      id: data.id,
      name: data.name,
      userId,
      entities: {
        create: data.entities?.map((entity: any) => ({
          id: entity.id,
          type: entity.type,
          data: entity,
        })),
      },
    };

    const prisma = await prismaPromise;
    const map = await prisma.argumentMap.create({
      data: transformedData,
      include: {
        entities: true, // Include the created entities in the response
      },
    });

    return NextResponse.json(map);
  } catch (error) {
    console.error("Error creating map:", error);
    return NextResponse.json(
      { error: "Failed to create map" },
      { status: 500 },
    );
  }
}
