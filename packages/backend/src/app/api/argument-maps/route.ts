import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../db/client";
import { getOrCreateUserFromAuth } from "../../../auth/authUser";

export async function GET(request: NextRequest) {
  try {
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
      { status: 500 }
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
      ...data,
      userId,
      entities: {
        create: data.entities?.map((entity: any) => ({
          id: entity.id,
          type: entity.type,
          data: { text: entity.text }, // Store text in the data JSON field
          autoVisibility: entity.autoVisibility,
        })),
      },
      conclusions: {
        create: data.conclusions?.map((conclusion: any) => ({
          propositionIds: conclusion.propositionIds,
          sourceNames: conclusion.sourceNames,
          urls: conclusion.urls,
        })),
      },
    };

    // Remove the createdBy object since we're setting userId directly
    delete transformedData.createdBy;

    const map = await prisma.argumentMap.create({
      data: transformedData,
      include: {
        entities: true, // Include the created entities in the response
        conclusions: true, // Include the created conclusions in the response
      },
    });

    return NextResponse.json(map);
  } catch (error) {
    console.error("Error creating map:", error);
    return NextResponse.json(
      { error: "Failed to create map" },
      { status: 500 }
    );
  }
}
