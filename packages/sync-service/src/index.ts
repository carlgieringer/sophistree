import { LocalFirstAuthSyncServer } from "@localfirst/auth-syncserver";
import { PostgresStorageAdapter } from "automerge-repo-storage-postgres";

const tableName = process.env.ARGUMENT_MAPS_AUTOMERGE_STORAGE_TABLE_NAME;
if (!tableName) {
  throw new Error(
    "ARGUMENT_MAPS_AUTOMERGE_STORAGE_TABLE_NAME env. var. is required.",
  );
}
const host = "localhost";
const port = 3030;
const storageDir = "dist/localfirst-auth-syncserver-storage";
const storage = new PostgresStorageAdapter(tableName);
const syncServer = new LocalFirstAuthSyncServer(host);
await syncServer.listen({ port, storageDir, storage });
