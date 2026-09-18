import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../../support/e2e";
import {
  goToTaskOverview,
  shortTraining,
  trainLocallyAndSave,
} from "../../support/training";

it("completes local Titanic training and saves the model", () => {
  setupServerWith(shortTraining(defaultTasks.titanic));
  goToTaskOverview();
  cy.contains("button", "next").click();
  cy.get('[data-testid="select-tabular-button"]')
    .first()
    .selectFile("cypress/fixtures/local_training/titanic.csv");

  trainLocallyAndSave("Titanic Prediction");

  cy.contains("button", "test model").click();
  cy.url().should("include", "/evaluate");
  cy.contains("Titanic Prediction");
});
