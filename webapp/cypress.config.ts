import { defineConfig } from "cypress";
import * as path from "node:path";
import * as fs from "node:fs/promises";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8081/",
    setupNodeEvents(on) {
      on("task", {
        readdir: async (p: string) =>
          (await fs.readdir(p)).map((filename) => path.join(p, filename)),
        log: (message) => {
          console.log(message)
          return null
        },
      });
    },
  },
});
