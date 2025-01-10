import { config } from "dotenv";
import { existsSync } from "fs";
import { PostgresStorageAdapter } from "automerge-repo-storage-postgres";

if (existsSync(".env")) {
  config();
}

import { SyncServer } from "./server.js";

const tableName = process.env.ARGUMENT_MAPS_AUTOMERGE_STORAGE_TABLE_NAME;
if (!tableName) {
  throw new Error(
    "ARGUMENT_MAPS_AUTOMERGE_STORAGE_TABLE_NAME env. var. is required.",
  );
}
const host = "0.0.0.0";
const port = 3030;
const storage = new PostgresStorageAdapter(tableName);
const peerId = "sophistree-sync-server";
new SyncServer({
  host,
  port,
  storage,
  peerId,
});
