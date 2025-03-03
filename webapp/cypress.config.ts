import { defineConfig } from "cypress";
import * as path from "node:path";
import * as fs from "node:fs/promises";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8081/",
    projectId: "aps8et", // to get recordings on Cypress Cloud
    setupNodeEvents(on) {
      on("task", {
        readdir: async (p: string) =>
          (await fs.readdir(p)).map((filename) => path.join(p, filename)),
      });
    },
  },
});
