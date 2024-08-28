import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e";

describe("training page", () => {
  it("is navigable", () => {
    setupServerWith(defaultTasks.titanic);

    cy.visit("/");

    cy.contains("button", "get started").click();
    cy.contains("button", "participate").click();
    cy.contains("button", "participate").click();

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

    cy.visit("/");

    cy.contains("button", "get started").click();
    cy.contains("button", "participate").click();
    cy.contains("button", "participate").click();
    cy.contains("button", "next").click();

    cy.contains("label", "select CSV").selectFile(
      "../datasets/titanic_train.csv",
    );
    cy.contains("button", "next").click();

    cy.contains("button", "locally").click();
    cy.contains("button", "start training").click();
    cy.contains("h6", "epochs")
      .next({ timeout: 40_000 })
      .should("have.text", "10 / 10");
    cy.contains("button", "next").click();

    cy.contains("button", "test model").click();
  });

  it("can start and stop training of lus_covid", () => {
    setupServerWith(defaultTasks.lusCovid);

    // throwing to stop training
    cy.on("uncaught:exception", (e) => !e.message.includes("stop training"));

    cy.visit("/");

    cy.contains("button", "get started").click();
    cy.contains("button", "participate").click();
    cy.contains("button", "participate").click();
    cy.contains("button", "next").click();

    cy.task<string[]>("readdir", "../datasets/lus_covid/COVID+/").then(
      (files) =>
        cy
          .contains("h4", "COVID-Positive")
          .parents()
          .contains("select images")
          .selectFile(files),
    );
    cy.task<string[]>("readdir", "../datasets/lus_covid/COVID-/").then(
      (files) =>
        cy
          .contains("h4", "COVID-Negative")
          .parents()
          .contains("select images")
          .selectFile(files),
    );
    cy.contains("button", "next").click();

    cy.contains("button", "locally").click();
    cy.contains("button", "start training").click();
    cy.contains("h6", "current batch")
      .next({ timeout: 40_000 })
      .should("have.text", "2");

    cy.contains("button", "stop training").click();
  });
});
