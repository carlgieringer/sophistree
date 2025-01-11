import express, { Express } from "express";
import { WebSocketServer, WebSocket } from "ws";
import {
  Repo,
  StorageAdapterInterface,
  PeerId,
  RepoConfig,
} from "@automerge/automerge-repo";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import os from "os";
import { Server as HttpServer, IncomingMessage } from "http";
import { Duplex } from "stream";

interface ServerOptions {
  storage?: StorageAdapterInterface;
  peerId?: string;
  port?: number;
  host?: string;
}

export class SyncServer {
  #socket: WebSocketServer;
  #server: HttpServer;
  #readyResolvers: ((value: boolean) => void)[] = [];
  #isReady = false;
  #repo: Repo;
  #port: number;
  #storage?: StorageAdapterInterface;

  constructor(options: ServerOptions = {}) {
    const {
      storage,
      peerId = `storage-server-${os.hostname()}`,
      port = 3030,
      host = "localhost",
    } = options;

    this.#port = port;
    this.#storage = storage;
    this.#socket = new WebSocketServer({ noServer: true });

    const app: Express = express();
    app.use(express.static("public"));

    const config: RepoConfig = {
      network: [new NodeWSServerAdapter(this.#socket)],
      storage,
      peerId: peerId as unknown as PeerId, // Convert string to PeerId type
      // Since this is a server, we don't share generously — meaning we only sync documents they already
      // know about and can ask for by ID.
      sharePolicy: () => Promise.resolve(false),
    };
    this.#repo = new Repo(config);

    app.get("/", (_req, res) => {
      res.send(`👍 @automerge/automerge-repo-sync-server is running`);
    });

    this.#server = app.listen(port, host, () => {
      console.log(`Listening on ${host}:${port}`);
      this.#isReady = true;
      this.#readyResolvers.forEach((resolve) => resolve(true));
    });

    this.#server.on(
      "upgrade",
      (request: IncomingMessage, socket: Duplex, head: Buffer) => {
        this.#socket.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          this.#socket.emit("connection", ws, request);
        });
      },
    );
  }

  async ready(): Promise<boolean> {
    if (this.#isReady) {
      return true;
    }

    return new Promise((resolve) => {
      this.#readyResolvers.push(resolve);
    });
  }

  async listen(options: ServerOptions): Promise<void> {
    const { port, storage, peerId } = options;
    if (port) this.#port = port;
    if (storage) this.#storage = storage;
    // Create a new repo with updated config if peerId changes
    if (peerId) {
      const config: RepoConfig = {
        network: [new NodeWSServerAdapter(this.#socket)],
        storage: this.#storage,
        peerId: peerId as unknown as PeerId,
        sharePolicy: () => Promise.resolve(false),
      };
      this.#repo = new Repo(config);
    }
    await this.ready();
  }

  close(): void {
    this.#socket.close();
    this.#server.close();
  }
}
