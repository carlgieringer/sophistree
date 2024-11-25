import { NextRequest } from "next/server";
import prismaPromise from "../../../db/client";
import { POST, GET } from "./route";

// Mock only verifyToken from the verify module
jest.mock("../../../auth/verify", () => ({
  ...jest.requireActual("../../../auth/verify"), // Keep the real getOrCreateUser
  verifyToken: jest.fn().mockResolvedValue({
    email: "test@example.com",
    fullName: "Test User",
    givenName: "Test",
    familyName: "User",
    authId: "test-auth-id",
    pictureUrl: "https://example.com/picture.jpg",
  }),
}));

// Reset database before each test
beforeEach(async () => {
  const prisma = await prismaPromise;
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
        },
      );

      const response = await GET(request);
      expect(response.status).toBe(200);

      const maps = await response.json();
      expect(maps).toEqual([]);
    });

    it("should return all maps ordered by updatedAt desc", async () => {
      const prisma = await prismaPromise;
      // Create a test user
      const user = await prisma.user.create({
        data: {
          email: "test@example.com",
          authExternalId: "test-auth-id",
          authProvider: "google",
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
        },
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
      const prisma = await prismaPromise;
      // Create a test user first
      const user = await prisma.user.create({
        data: {
          email: "test@example.com",
          authExternalId: "test-auth-id", // Match the authId from verifyToken mock
          authProvider: "google",
        },
      });

      const entityId = "test-entity-id";
      const entity = {
        id: entityId,
        type: "Proposition",
        text: "Test Proposition",
      };
      const requestData = {
        data: {
          name: "Test Map",
          entities: [entity],
        },
      };

      // Create mock request with auth headers
      const request = new NextRequest(
        "http://localhost:3000/api/argument-maps",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer fake-token",
            "x-auth-provider": "google",
          },
          body: JSON.stringify(requestData),
        },
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
        include: {
          entities: true,
        },
      });
      expect(mapInDb).not.toBeNull();
      expect(mapInDb?.name).toBe("Test Map");
      expect(mapInDb?.userId).toBe(user?.id);

      // Verify the entity was created and linked to the map
      expect(mapInDb?.entities).toHaveLength(1);
      const entityInDb = mapInDb?.entities[0];
      expect(entityInDb?.id).toBe(entityId);
      expect(entityInDb?.type).toBe("Proposition");
      expect(entityInDb?.data).toEqual(entity);
      expect(entityInDb?.mapId).toBe(mapInDb?.id);
    });

    it("should return 401 if auth header is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/argument-maps",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: { name: "Test Map" } }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
