import { NextRequest } from "next/server";
import prisma from "../../../db/client";
import { POST, GET } from "./route";

// Reset database before each test
beforeEach(async () => {
  await prisma.conclusion.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.argumentMap.deleteMany();
  await prisma.user.deleteMany();
});

describe("Argument maps collection resource", () => {
  describe("GET /api/argument-maps", () => {
    it("should return empty array when no maps exist", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/argument-maps",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const maps = await response.json();
      expect(maps).toEqual([]);
    });

    it("should return all maps ordered by updatedAt desc", async () => {
      // Create a test user
      const user = await prisma.user.create({
        data: {
          email: "test@example.com",
          authExternalId: "test-external-id",
          authProvider: "test-provider",
        },
      });

      // Create test maps with different dates
      const oldMap = await prisma.argumentMap.create({
        data: {
          name: "Old Map",
          userId: user.id,
          updatedAt: new Date("2023-01-01"),
        },
      });

      const newMap = await prisma.argumentMap.create({
        data: {
          name: "New Map",
          userId: user.id,
          updatedAt: new Date("2023-02-01"),
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/argument-maps",
        {
          method: "GET",
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const maps = await response.json();
      expect(maps).toHaveLength(2);
      expect(maps[0].id).toBe(newMap.id); // Newer map should be first
      expect(maps[1].id).toBe(oldMap.id); // Older map should be second
    });
  });

  describe("POST /api/argument-maps", () => {
    it("should create an argument map in the database", async () => {
      // Create a test user first
      const user = await prisma.user.create({
        data: {
          email: "test@example.com",
          authExternalId: "test-external-id",
          authProvider: "test-provider",
        },
      });

      // Create mock request
      const request = new NextRequest(
        "http://localhost:3000/api/argument-maps",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user.id,
          },
          body: JSON.stringify({ name: "Test Map" }),
        }
      );

      // Call the API endpoint
      const response = await POST(request);
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.name).toBe("Test Map");
      expect(responseData.userId).toBe(user.id);

      // Verify the map was created in the database
      const mapInDb = await prisma.argumentMap.findUnique({
        where: { id: responseData.id },
      });
      expect(mapInDb).not.toBeNull();
      expect(mapInDb?.name).toBe("Test Map");
      expect(mapInDb?.userId).toBe(user.id);
    });

    it("should return 404 if user ID is not provided", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/argument-maps",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "Test Map" }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("should return 400 if name is not provided", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/argument-maps",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "some-user-id",
          },
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
