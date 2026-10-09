import { defineConfig } from "cypress";
import * as http from "node:http";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as msgpack from "@msgpack/msgpack";
import { loadEnv } from "vite";
import { WebSocketServer } from "ws";

import type { mtype } from "@epfml/discojs";

/**
 * Messages the server answers with, depending on the type of the message it received.
 */
type ServerScript = Partial<Record<mtype.MType, unknown[]>>;

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
      const { type } = msgpack.decode(data) as { type: mtype.MType };
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

// Verify that the scripted server has a proper URL
const scriptedServer = process.env.DISCO_SCRIPTED_SERVER_E2E === "1";
if (
  scriptedServer &&
  (serverUrl.hostname !== "server" || serverUrl.port === "")
)
  throw new Error(
    `the scripted server needs http://server:<port>, not ${serverUrl.origin}`,
  );

export default defineConfig({
  // We need the mapping to resolve the "server" hostname to 127.0.0.1
  hosts: scriptedServer ? { [serverUrl.hostname]: "127.0.0.1" } : {},
  e2e: {
    baseUrl: "http://localhost:1351/",
    projectId: "aps8et", // to get recordings on Cypress Cloud
    excludeSpecPattern: [
      // Training tests run separately from the regular E2E suite
      ...(process.env.DISCO_TRAINING_E2E === "1"
        ? []
        : [
            "cypress/e2e/training/local/**/*.cy.ts",
            "cypress/e2e/training/federated/**/*.cy.ts",
            "cypress/e2e/training/decentralized/**/*.cy.ts",
          ]),
      ...(scriptedServer ? [] : ["cypress/e2e/training/scripted/**/*.cy.ts"]),
    ],
    setupNodeEvents(on) {
      // Creates a scripted server
      const scriptServer = scriptedServer
        ? serveWebSockets(Number(serverUrl.port))
        : undefined;

      on("task", {
        readdir: async (p: string) =>
          (await fs.readdir(p)).map((filename) => path.join(p, filename)),
        scriptServer: (script: ServerScript) => {
          if (scriptServer === undefined)
            throw new Error(
              `scriptServer needs the fake server, not ${serverUrl.origin}`,
            );
          scriptServer(script);
          return null; // Cypress tasks must return something
        },
      });
    },
  },
});
