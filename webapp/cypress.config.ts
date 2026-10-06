import { defineConfig } from "cypress";
import * as http from "node:http";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as msgpack from "@msgpack/msgpack";
import { loadEnv } from "vite";
import { WebSocketServer } from "ws";

/**
 * Messages the server answers with, depending on the type of the message it received.
 */
type ServerScript = Record<number, unknown[]>;

/**
 * Serve the WebSockets of the server.
 * This allows tests to script what the server answers per message type.
 * Used to change the script of the server during tests.
 *
 * @returns the function changing the script
 */
function serveWebSockets(port: number): (script: ServerScript) => void {
  let script: ServerScript = {};

  const handle = http.createServer((_, res) => res.writeHead(404).end());
  new WebSocketServer({ server: handle }).on("connection", (ws) =>
    ws.on("message", (data: Buffer) => {
      const { type } = msgpack.decode(data) as { type: number };
      for (const answer of script[type] ?? []) ws.send(msgpack.encode(answer));
    }),
  );
  handle.listen(port, "127.0.0.1");

  return (newScript) => (script = newScript);
}

// Gets the server URL from test env
const serverUrl = new URL(
  loadEnv("test", import.meta.dirname).VITE_SERVER_URL ?? "",
);

export default defineConfig({
  // Maps the server hostname to the local address for testing
  // Without it, the websocket never connects as "server" does not exist in the DNS
  hosts: { [serverUrl.hostname]: "127.0.0.1" },
  e2e: {
    baseUrl: "http://localhost:1351/",
    projectId: "aps8et", // to get recordings on Cypress Cloud
    setupNodeEvents(on) {
      const scriptServer = serveWebSockets(Number(serverUrl.port));

      on("task", {
        readdir: async (p: string) =>
          (await fs.readdir(p)).map((filename) => path.join(p, filename)),
        scriptServer: (script: ServerScript) => {
          scriptServer(script);
          return null; // Cypress tasks must return something
        },
      });
    },
  },
});
