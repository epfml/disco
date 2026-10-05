import { defineConfig } from "cypress";
import * as path from "node:path";
import * as fs from "node:fs/promises";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:1351/",
    projectId: "aps8et", // to get recordings on Cypress Cloud
    excludeSpecPattern:
      // This variable is set by the CI to create 2 separate test groups:
      // 1) Local e2e training tests and 2) collaborative e2e training tests
      process.env.DISCO_COLLABORATIVE_E2E === "1"
        ? []
        : [
            "cypress/e2e/training/federated/**/*.cy.ts",
            "cypress/e2e/training/decentralized/**/*.cy.ts",
          ],
    setupNodeEvents(on) {
      on("task", {
        readdir: async (p: string) =>
          (await fs.readdir(p)).map((filename) => path.join(p, filename)),
      });
    },
  },
});
