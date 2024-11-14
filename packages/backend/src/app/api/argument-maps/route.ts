import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../db/client";

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
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const map = await prisma.argumentMap.create({
      data: {
        name,
        userId,
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
