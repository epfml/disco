import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../../support/e2e";
import {
  goToTaskOverview,
  shortTraining,
  trainLocallyAndSave,
} from "../../support/training";

it("completes local LUS COVID training and saves the model", () => {
  setupServerWith(shortTraining(defaultTasks.lusCovid));
  goToTaskOverview();
  cy.contains("button", "next").click();

  for (const [directory, label] of [
    ["COVID+", "COVID-Positive"],
    ["COVID-", "COVID-Negative"],
  ]) {
    cy.task<string[]>("readdir", `../datasets/lus_covid/${directory}/`).then(
      (files) => {
        const file = files.filter((p) => /\.(png|jpe?g)$/i.test(p)).sort()[0];
        if (file === undefined) throw new Error(`No images in ${directory}`);
        cy.contains("h4", label)
          .parents()
          .eq(1)
          .find('[data-testid="select-image-button"]')
          .selectFile(file);
      },
    );
  }

  trainLocallyAndSave("Lung Ultrasound Image Classification");
});
