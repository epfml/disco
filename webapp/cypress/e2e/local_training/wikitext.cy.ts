import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../../support/e2e";
import {
  goToTaskOverview,
  shortTraining,
  trainLocallyAndSave,
} from "../../support/training";

it("completes local Wikitext training and saves the model", () => {
  setupServerWith(shortTraining(defaultTasks.wikitext));
  goToTaskOverview();
  cy.contains("button", "next").click();
  cy.get('[data-testid="select-text-button"]').selectFile(
    "cypress/fixtures/local_training/wikitext.txt",
  );

  trainLocallyAndSave("GPT Language Modeling");
});
