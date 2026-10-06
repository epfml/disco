import { defineConfig } from "cypress";
import * as path from "node:path";
import * as fs from "node:fs/promises";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:1351/",
    projectId: "aps8et", // to get recordings on Cypress Cloud
    excludeSpecPattern:
      // Training tests run separately from the regular E2E suite.
      process.env.DISCO_TRAINING_E2E === "1"
        ? []
        : [
            "cypress/e2e/training/local/**/*.cy.ts",
            "cypress/e2e/training/federated/**/*.cy.ts",
            "cypress/e2e/training/decentralized/**/*.cy.ts",
          ],
    setupNodeEvents(on) {
      on("before:browser:launch", (browser, launchOptions) => {
        launchOptions.args = launchOptions.args.filter((arg) => arg !== "--disable-gpu");
        if (browser.family === "chromium") {
          launchOptions.args.push(
            "--enable-unsafe-webgpu",
            "--use-angle=vulkan",
            "--enable-features=Vulkan",
            "--disable-software-rasterizer",
          );
        }
        if (browser.family === "firefox") {
          launchOptions.preferences["dom.webgpu.enabled"] = true;
          launchOptions.preferences["gfx.webrender.all"] = true;
        }
        return launchOptions;
      });
      on("task", {
        readdir: async (p: string) =>
          (await fs.readdir(p)).map((filename) => path.join(p, filename)),
      });
    },
  },
});
