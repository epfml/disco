import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e";

function goToTaskOverview() {
  cy.visit("/");
  cy.contains("a", "Start training").click();
  cy.get(".driver-popover-close-btn").click();
  cy.contains("button", "participate").click();
}

describe("training page", () => {
  it("is navigable", () => {
    setupServerWith(defaultTasks.titanic);

    goToTaskOverview();

    const navigationButtons = 3;
    for (let i = 0; i < navigationButtons; i++) {
      cy.contains("button", "next").click();
    }
    for (let i = 0; i < navigationButtons + 1; i++) {
      cy.contains("button", "previous").click();
    }
  });

  it("can train titanic", () => {
    setupServerWith(defaultTasks.titanic);

    goToTaskOverview();
    cy.contains("button", "next").click();

    cy.contains("Drop CSV");
    cy.get('[data-testid="select-tabular-button"]')
      .first()
      .selectFile("../datasets/titanic_train.csv");
    cy.contains("button", "next").click();

    cy.contains("button", "locally").click();
    cy.contains("button", "Start training").click();
    cy.contains("h6", "epochs")
      .next({ timeout: 40_000 })
      .should("have.text", "10 / 10");
    cy.contains("button", "next").click();

    cy.contains("button", "test model").click();

    cy.contains("Titanic Prediction");
  });

  it("can start and stop training of lus_covid", () => {
    setupServerWith(defaultTasks.lusCovid);

    // throwing to stop training
    cy.on("uncaught:exception", (e) => !e.message.includes("stop training"));

    goToTaskOverview();
    cy.contains("button", "next").click();

    cy.task<string[]>("readdir", "../datasets/lus_covid/COVID+/").then(
      (files) =>
        cy
          .contains("h4", "COVID-Positive")
          .parents()
          .get('[data-testid="select-image-button"]')
          .selectFile(files),
    );
    cy.task<string[]>("readdir", "../datasets/lus_covid/COVID-/").then(
      (files) =>
        cy
          .contains("h4", "COVID-Negative")
          .parents()
          .get('[data-testid="select-image-button"]')
          .selectFile(files),
    );
    cy.contains("button", "next").click();

    cy.contains("button", "locally").click();
    cy.contains("button", "Start training").click();
    cy.contains("h6", "current batch")
      .next({ timeout: 40_000 })
      .should("have.text", "2");

    cy.contains("button", "stop training").click();
  });
});
