import { PrismaClient } from "@prisma/client";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

async function makePrismaClient() {
  // Locally, we should provide a DATABASE_URL
  if (process.env.DATABASE_URL) {
    return new PrismaClient();
  }

  if (process.env.NODE_ENV !== "production") {
    throw new Error(
      "DATABASE_URL is required for non-production environments.",
    );
  }

  const password = await getDbPasswordFromParameterStore();
  return new PrismaClient({
    datasources: {
      db: {
        url: `postgresql://sophistree:${password}@sophistree-db:5432/sophistree`,
      },
    },
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

async function getDbPasswordFromParameterStore() {
  const ssmClient = new SSMClient({ region: process.env.AWS_REGION });
  const command = new GetParameterCommand({
    Name: process.env.DB_PASSWORD_PARAMETER_ARN,
    WithDecryption: true,
  });

  try {
    const response = await ssmClient.send(command);
    return response.Parameter?.Value;
  } catch (error) {
    console.error("Error fetching DB password from SSM:", error);
    throw error;
  }
}
