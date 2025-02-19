import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "./route";
import prismaPromise from "../../../../db/client";
import { ArgumentMap, User } from "@prisma/client";
import { verifyToken } from "../../../../auth/verify";

// Mock only verifyToken from the verify module
jest.mock("../../../../auth/verify", () => ({
  ...jest.requireActual("../../../../auth/verify"), // Keep the real getOrCreateUser
  verifyToken: jest.fn().mockResolvedValue({
    email: "test@example.com",
    fullName: "Test User",
    givenName: "Test",
    familyName: "User",
    authId: "test-auth-id",
    pictureUrl: "https://example.com/picture.jpg",
  }),
}));

describe("Argument maps individual resource", () => {
  let testMap: ArgumentMap;
  let testUser: User;
  let otherUser: User;

  beforeEach(async () => {
    const prisma = await prismaPromise;
    // Clean up database
    await prisma.entity.deleteMany();
    await prisma.argumentMap.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: "test@example.com",
        authExternalId: "test-auth-id",
        authProvider: "google",
      },
    });

    otherUser = await prisma.user.create({
      data: {
        email: "other@example.com",
        authExternalId: "other-external-id",
        authProvider: "google",
      },
    });

    // Create a test map
    testMap = await prisma.argumentMap.create({
      data: {
        name: "Test Map",
        userId: testUser.id,
        sourceNameOverrides: {},
        entities: {
          create: [
            {
              id: "entity1",
              type: "Proposition",
              data: {
                id: "entity1",
                type: "Proposition",
                text: "Test claim",
              },
            },
            {
              id: "entity2",
              type: "Proposition",
              data: {
                id: "entity2",
                type: "Proposition",
                text: "Test claim 2",
              },
            },
          ],
        },
      },
      include: {
        entities: true,
      },
    });
  });

  describe("GET /api/argument-maps/[id]", () => {
    it("should return a map when found", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
      );
      const response = await GET(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(
        expect.objectContaining({
          id: testMap.id,
          name: testMap.name,
          userId: testMap.userId,
          entities: expect.arrayContaining([
            expect.objectContaining({
              id: "entity1",
              type: "Proposition",
            }),
            expect.objectContaining({
              id: "entity2",
              type: "Proposition",
            }),
          ]),
        }),
      );
    });

    it("should return 404 when map is not found", async () => {
      const request = new NextRequest(
        "http://localhost/api/argument-maps/nonexistent-id",
      );
      const response = await GET(request, { params: { id: "nonexistent-id" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Map not found" });
    });
  });

  describe("PUT /api/argument-maps/[id]", () => {
    const updateData = {
      name: "Updated Map Name",
    };

    it("should update a map when authorized", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer fake-token",
            "x-auth-provider": "google",
            "content-type": "application/json",
          },
          body: JSON.stringify({ data: updateData }),
        },
      );

      const response = await PUT(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe(updateData.name);

      // Verify the update in the database
      const prisma = await prismaPromise;
      const updatedMap = await prisma.argumentMap.findUnique({
        where: { id: testMap.id },
      });
      expect(updatedMap?.name).toBe(updateData.name);
    });

    it("should update existing entities and create new ones", async () => {
      const updateDataWithEntities = {
        name: "Updated Map Name",
        entities: [
          {
            id: "entity1", // Existing entity
            type: "Proposition",
            text: "Updated proposition",
          },
          {
            id: "new-entity1", // New entity
            type: "Proposition",
            text: "New Proposition",
          },
        ],
      };

      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer fake-token",
            "x-auth-provider": "google",
            "content-type": "application/json",
          },
          body: JSON.stringify({ data: updateDataWithEntities }),
        },
      );

      const response = await PUT(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe(updateDataWithEntities.name);

      // Verify the entities were updated
      const prisma = await prismaPromise;
      const updatedMap = await prisma.argumentMap.findUnique({
        where: { id: testMap.id },
        include: { entities: true },
      });

      expect(updatedMap?.entities).toHaveLength(2);
      expect(updatedMap?.entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "entity1",
            type: "Proposition",
            data: expect.objectContaining({ text: "Updated proposition" }),
          }),
          expect.objectContaining({
            id: "new-entity1",
            type: "Proposition",
            data: expect.objectContaining({ text: "New Proposition" }),
          }),
        ]),
      );

      // Verify entity2 was deleted
      const entity2 = await prisma.entity.findUnique({
        where: { id_mapId: { id: "entity2", mapId: testMap.id } },
      });
      expect(entity2).toBeNull();
    });

    it("should return 401 when auth header is missing", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ data: updateData }),
        },
      );

      const response = await PUT(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 404 when map is not found", async () => {
      const request = new NextRequest(
        "http://localhost/api/argument-maps/nonexistent-id",
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer fake-token",
            "x-auth-provider": "google",
            "content-type": "application/json",
          },
          body: JSON.stringify({ data: updateData }),
        },
      );

      const response = await PUT(request, { params: { id: "nonexistent-id" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Map not found" });
    });

    it("should return 403 when user is not authorized", async () => {
      // Use otherUser's auth token
      jest.mocked(verifyToken).mockResolvedValueOnce({
        email: "other@example.com",
        fullName: "Other User",
        givenName: "Other",
        familyName: "User",
        authId: "other-external-id",
        pictureUrl: "https://example.com/other.jpg",
        isVerifiedEmail: true,
      });

      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer fake-token",
            "x-auth-provider": "google",
            "content-type": "application/json",
          },
          body: JSON.stringify({ data: updateData }),
        },
      );

      const response = await PUT(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Not authorized" });
    });

    it("should return 400 when data is missing", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer fake-token",
            "x-auth-provider": "google",
            "content-type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const response = await PUT(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Data is required" });
    });
  });

  describe("DELETE /api/argument-maps/[id]", () => {
    it("should delete a map when authorized", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer fake-token",
            "x-auth-provider": "google",
          },
        },
      );

      const response = await DELETE(request, { params: { id: testMap.id } });
      expect(response.status).toBe(204);

      // Verify the map was deleted
      const prisma = await prismaPromise;
      const deletedMap = await prisma.argumentMap.findUnique({
        where: { id: testMap.id },
      });
      expect(deletedMap).toBeNull();
    });

    it("should return 401 when auth header is missing", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "DELETE",
        },
      );

      const response = await DELETE(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it("should return 404 when map is not found", async () => {
      const request = new NextRequest(
        "http://localhost/api/argument-maps/nonexistent-id",
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer fake-token",
            "x-auth-provider": "google",
          },
        },
      );

      const response = await DELETE(request, {
        params: { id: "nonexistent-id" },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Map not found" });
    });

    it("should return 403 when user is not authorized", async () => {
      // Use otherUser's auth token
      jest.mocked(verifyToken).mockResolvedValueOnce({
        email: "other@example.com",
        fullName: "Other User",
        givenName: "Other",
        familyName: "User",
        authId: "other-external-id",
        pictureUrl: "https://example.com/other.jpg",
        isVerifiedEmail: true,
      });

      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer fake-token",
            "x-auth-provider": "google",
          },
        },
      );

      const response = await DELETE(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Not authorized" });
    });
  });
});
