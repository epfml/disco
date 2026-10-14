import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../../../support/e2e";
import { goToTaskOverview } from "../../../support/training";
import { trainLocallyAndSave } from "../../../support/training/local";

it("completes local Titanic training and saves the model", () => {
  const titanicTask = defaultTasks.titanic;
  setupServerWith(titanicTask);
  goToTaskOverview();
  cy.contains("button", "next").click();
  cy.get('[data-testid="select-tabular-button"]')
    .first()
    .selectFile("../datasets/titanic_train.csv");

  cy.then(() => titanicTask.getTask()).then((task) => {
    trainLocallyAndSave(
      "Titanic Prediction",
      task.trainingInformation.epochs,
      5 * 60 * 1000, // 5 minutes
    );
  });

  cy.contains("button", "test model").click();
  cy.url().should("include", "/evaluate");
  cy.contains("Model Testing");
});

it("stops training and keeps the partial model", () => {
  setupServerWith(defaultTasks.titanic);
  goToTaskOverview();
  cy.contains("button", "next").click();
  cy.get('[data-testid="select-tabular-button"]')
    .first()
    .selectFile("../datasets/titanic_train.csv");
  cy.contains("button", "next").click();
  cy.contains("button", "locally").click();
  cy.contains("button", "Start training").click();
  cy.contains("h6", "current batch").next().should("not.have.text", "0");
  cy.contains("button", "stop training").click();
  cy.contains("Training stopped", { timeout: 30_000 }).should("be.visible");
  cy.contains("button", "Start training").should("be.visible");
  cy.contains("button", "next").click();
  cy.contains("button", "save model").click();
  cy.contains("The trained Titanic Prediction model has been saved.").should(
    "exist",
  );
});
