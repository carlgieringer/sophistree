import { PrismaClient } from "@prisma/client";
import { getPrismaDatabaseUrl } from "./config";

async function makePrismaClient() {
  // Locally, we should provide a DATABASE_URL
  if (process.env.DATABASE_URL) {
    if (process.env.DEBUG_PRINT_QUERIES) {
      console.log("Debugging enabled");
      const prisma = new PrismaClient({
        log: [
          {
            emit: "event",
            level: "query",
          },
        ],
      });
      prisma.$on("query", async (e) => {
        console.log(`${e.query} ${e.params}`);
      });
      return prisma;
    }
    return new PrismaClient();
  }

  if (process.env.NODE_ENV !== "production") {
    throw new Error(
      "DATABASE_URL is required for non-production environments.",
    );
  }

  const url = await getPrismaDatabaseUrl();
  return new PrismaClient({
    datasources: { db: { url } },
  });
}

declare const globalThis: {
  prismaClientPromise: Promise<PrismaClient>;
} & typeof global;

const prismaClientPromise =
  globalThis.prismaClientPromise ?? makePrismaClient();

export default prismaClientPromise;

// Ensure a single client despite next.js hot reloads.
// https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices#solution
if (process.env.NODE_ENV !== "production")
  globalThis.prismaClientPromise = prismaClientPromise;
