import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../../../support/e2e";
import {
  assertNoErrorToast,
  goToTaskOverview,
  trainLocallyAndSave,
  withTrainingConfig,
} from "../../../support/training";

const numEpochs = 1;
const lusCovidTask = withTrainingConfig(defaultTasks.lusCovid, {
  epochs: numEpochs,
  roundDuration: 1,
  batchSize: 2,
  validationSplit: 0,
});

function uploadLusCovidDataset(): void {
  for (const [directory, label] of [
    ["COVID+", "COVID-Positive"],
    ["COVID-", "COVID-Negative"],
  ]) {
    cy.task<string[]>("readdir", `../datasets/lus_covid/${directory}/`).then(
      (files) => {
        const imageFiles = files
          .filter((p) => /\.(png|jpe?g)$/i.test(p))
          .slice(0, 1);
        if (imageFiles.length === 0)
          throw new Error(`No images in ${directory}`);
        cy.contains("h4", label)
          .parents()
          .eq(1)
          .find('[data-testid="select-image-button"]')
          .selectFile(imageFiles);
      },
    );
  }
}

function goToLusCovidDataset(): void {
  goToTaskOverview();
  cy.contains("button", "next").click();
  uploadLusCovidDataset();
}

it("completes local LUS COVID training and saves the model", () => {
  setupServerWith(lusCovidTask);
  goToLusCovidDataset();
  trainLocallyAndSave(
    "Lung Ultrasound Image Classification",
    numEpochs,
    300_000,
  );
});

it("can stop local LUS COVID training", () => {
  setupServerWith(lusCovidTask);

  // Stopping training raises this expected exception from the generator.
  cy.on("uncaught:exception", (e) => !e.message.includes("stop training"));

  goToLusCovidDataset();
  cy.contains("button", "next").click();
  cy.contains("button", "locally").click();
  cy.contains("button", "Start training").click();
  assertNoErrorToast();
  cy.contains("button", "stop training").click();
  cy.contains("button", "Start training", { timeout: 30_000 }).should(
    "be.visible",
  );
  assertNoErrorToast();
});
