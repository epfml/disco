import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../../../support/e2e";
import {
  goToTaskOverview,
  trainLocallyAndSave,
} from "../../../support/training";

it("completes local Titanic training on WebGPU and saves the model", () => {
  const titanicTask = defaultTasks.titanic;
  setupServerWith(titanicTask);
  goToTaskOverview("/?backend=webgpu");
  cy.window().its("tf").invoke("getBackend").should("equal", "webgpu");
  cy.contains("button", "next").click();
  cy.get('[data-testid="select-tabular-button"]')
    .first()
    .selectFile("../datasets/titanic_train.csv");

  cy.then(() => titanicTask.getTask()).then((task) => {
    trainLocallyAndSave(
      "Titanic Prediction",
      task.trainingInformation.epochs,
      5 * 60 * 1000,
    );
  });

  cy.contains("button", "test model").click();
  cy.url().should("include", "/evaluate");
  cy.contains("Model Testing");
});
