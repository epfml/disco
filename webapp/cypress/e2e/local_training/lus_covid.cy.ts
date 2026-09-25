import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../../support/e2e";
import {
  goToTaskOverview,
  trainLocallyAndSave,
  withTrainingConfig,
} from "../../support/training";

it("completes local LUS COVID training and saves the model", () => {
  setupServerWith(
    withTrainingConfig(defaultTasks.lusCovid, {
      epochs: 4,
      roundDuration: 4,
    }),
  );
  goToTaskOverview();
  cy.contains("button", "next").click();

  for (const [directory, label] of [
    ["COVID+", "COVID-Positive"],
    ["COVID-", "COVID-Negative"],
  ]) {
    cy.task<string[]>("readdir", `../datasets/lus_covid/${directory}/`).then(
      (files) => {
        const imageFiles = files.filter((p) => /\.(png|jpe?g)$/i.test(p));
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

  trainLocallyAndSave("Lung Ultrasound Image Classification", 4, 300_000);
});
