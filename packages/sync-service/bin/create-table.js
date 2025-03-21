import pg from "pg";
import dotenv from "dotenv";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get current file's directory
const __dirname = dirname(fileURLToPath(import.meta.url));

async function createTable() {
  try {
    dotenv.config();

    // Configured via env vars.
    const client = new pg.Client();

    await client.connect();
    console.log("Connected to PostgreSQL database");

    const sqlPath = join(__dirname, "create_table.sql");
    let sqlContent = await readFile(sqlPath, "utf8");

    sqlContent = sqlContent.replace(
      "__the_table_name__",
      process.env.ARGUMENT_MAPS_AUTOMERGE_STORAGE_TABLE_NAME,
    );

    await client.query(sqlContent);
    console.log("Table created successfully");

    await client.end();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

createTable();
