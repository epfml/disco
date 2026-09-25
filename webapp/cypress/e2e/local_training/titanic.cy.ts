import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../../support/e2e";
import { goToTaskOverview, trainLocallyAndSave } from "../../support/training";

it("completes local Titanic training and saves the model", () => {
  setupServerWith(defaultTasks.titanic);
  goToTaskOverview();
  cy.contains("button", "next").click();
  cy.get('[data-testid="select-tabular-button"]')
    .first()
    .selectFile("../datasets/titanic_train.csv");

  trainLocallyAndSave("Titanic Prediction", 10);

  cy.contains("button", "test model").click();
  cy.url().should("include", "/evaluate");
  cy.contains("Titanic Prediction");
});
