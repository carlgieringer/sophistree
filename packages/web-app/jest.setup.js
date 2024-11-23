const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const crypto = require("crypto");

// Generate a unique database name for this test file
const testPath = expect.getState().testPath;
const hash = crypto
  .createHash("md5")
  .update(testPath)
  .digest("hex")
  .slice(0, 8);
const uniqueTestDbName = `sophistree_test_${hash}`;

// Set unique test database URL for this test file
const baseUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432";
process.env.DATABASE_URL = `${baseUrl}/${uniqueTestDbName}`;

// Create a new Prisma client for this test file's database
const prisma = new PrismaClient();

beforeAll(async () => {
  // Create a new database for this test file
  const rootPrisma = new PrismaClient({
    datasources: {
      db: {
        url: baseUrl + "/postgres", // Connect to default postgres database to create new DB
      },
    },
  });

  try {
    // Create the test database if it doesn't exist
    await rootPrisma.$executeRawUnsafe(
      `DROP DATABASE IF EXISTS ${uniqueTestDbName}`,
    );
    await rootPrisma.$executeRawUnsafe(`CREATE DATABASE ${uniqueTestDbName}`);
    await rootPrisma.$disconnect();

    // Apply migrations to the new test database
    console.log(`Applying migrations to test database ${uniqueTestDbName}...`);
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: "inherit",
    });
  } catch (error) {
    console.error("Failed to setup test database:", error);
    throw error;
  }
});

// Clean up database after each test
afterEach(async () => {
  const tablenames = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== "_prisma_migrations") {
      try {
        await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "public"."${tablename}" CASCADE;`,
        );
      } catch (error) {
        console.log({ error });
      }
    }
  }
});

afterAll(async () => {
  // First disconnect the test database client
  await prisma.$disconnect();

  // Connect to default postgres database to drop the test database
  const rootPrisma = new PrismaClient({
    datasources: {
      db: {
        url: baseUrl + "/postgres",
      },
    },
  });

  try {
    // Force terminate existing connections before dropping the database
    await rootPrisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${uniqueTestDbName}'
      AND pid <> pg_backend_pid();
    `);
    await rootPrisma.$executeRawUnsafe(
      `DROP DATABASE IF EXISTS ${uniqueTestDbName}`,
    );
  } catch (error) {
    console.error("Failed to cleanup test database:", error);
  } finally {
    await rootPrisma.$disconnect();
  }
});
