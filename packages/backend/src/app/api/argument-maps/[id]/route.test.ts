import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "./route";
import prisma from "../../../../db/client";
import { ArgumentMap, User } from "@prisma/client";

describe("Argument maps individual resource", () => {
  let testMap: ArgumentMap;
  let testUser: User;
  let otherUser: User;

  beforeEach(async () => {
    // Clean up database
    await prisma.conclusion.deleteMany();
    await prisma.entity.deleteMany();
    await prisma.argumentMap.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    testUser = await prisma.user.create({
      data: {
        email: "test@example.com",
        authExternalId: "test-external-id",
        authProvider: "test-provider",
      },
    });

    otherUser = await prisma.user.create({
      data: {
        email: "other@example.com",
        authExternalId: "other-external-id",
        authProvider: "test-provider",
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
              type: "CLAIM",
              data: {
                text: "Test claim",
                x: 0,
                y: 0,
              },
              autoVisibility: "SHOW",
            },
          ],
        },
        conclusions: {
          create: [
            {
              propositionIds: ["entity1"],
              sourceNames: [],
              urls: [],
            },
          ],
        },
      },
      include: {
        entities: true,
        conclusions: true,
      },
    });
  });

  describe("GET /api/argument-maps/[id]", () => {
    it("should return a map when found", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`
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
              type: "CLAIM",
            }),
          ]),
          conclusions: expect.arrayContaining([
            expect.objectContaining({
              propositionIds: ["entity1"],
            }),
          ]),
        })
      );
    });

    it("should return 404 when map is not found", async () => {
      const request = new NextRequest(
        "http://localhost/api/argument-maps/nonexistent-id"
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
            "x-user-id": testUser.id,
            "content-type": "application/json",
          },
          body: JSON.stringify({ data: updateData }),
        }
      );

      const response = await PUT(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe(updateData.name);

      // Verify the update in the database
      const updatedMap = await prisma.argumentMap.findUnique({
        where: { id: testMap.id },
      });
      expect(updatedMap?.name).toBe(updateData.name);
    });

    it("should return 404 when user ID is missing", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ data: updateData }),
        }
      );

      const response = await PUT(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "User not found" });
    });

    it("should return 404 when map is not found", async () => {
      const request = new NextRequest(
        "http://localhost/api/argument-maps/nonexistent-id",
        {
          method: "PUT",
          headers: {
            "x-user-id": testUser.id,
            "content-type": "application/json",
          },
          body: JSON.stringify({ data: updateData }),
        }
      );

      const response = await PUT(request, { params: { id: "nonexistent-id" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Map not found" });
    });

    it("should return 403 when user is not authorized", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "PUT",
          headers: {
            "x-user-id": otherUser.id,
            "content-type": "application/json",
          },
          body: JSON.stringify({ data: updateData }),
        }
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
            "x-user-id": testUser.id,
            "content-type": "application/json",
          },
          body: JSON.stringify({}),
        }
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
            "x-user-id": testUser.id,
          },
        }
      );

      const response = await DELETE(request, { params: { id: testMap.id } });
      expect(response.status).toBe(204);

      // Verify the map was deleted
      const deletedMap = await prisma.argumentMap.findUnique({
        where: { id: testMap.id },
      });
      expect(deletedMap).toBeNull();
    });

    it("should return 404 when user ID is missing", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "User not found" });
    });

    it("should return 404 when map is not found", async () => {
      const request = new NextRequest(
        "http://localhost/api/argument-maps/nonexistent-id",
        {
          method: "DELETE",
          headers: {
            "x-user-id": testUser.id,
          },
        }
      );

      const response = await DELETE(request, {
        params: { id: "nonexistent-id" },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Map not found" });
    });

    it("should return 403 when user is not authorized", async () => {
      const request = new NextRequest(
        `http://localhost/api/argument-maps/${testMap.id}`,
        {
          method: "DELETE",
          headers: {
            "x-user-id": otherUser.id,
          },
        }
      );

      const response = await DELETE(request, { params: { id: testMap.id } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: "Not authorized" });
    });
  });
});
