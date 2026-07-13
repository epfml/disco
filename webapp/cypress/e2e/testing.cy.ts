import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e";

it("can test titanic", () => {
  setupServerWith(defaultTasks.titanic);

  cy.visit("/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "test").click();

  cy.contains("Drop CSV");
  cy.get('[data-testid="select-tabular-button"]')
    .first()
    .selectFile("../datasets/titanic_train.csv");
  cy.contains("button", "next").click();

  cy.contains("Validate your model")
    .parent()
    .parent()
    .contains("button", "test")
    .click();

  cy.contains("button", "download as csv");
});

it("can test lus_covid", () => {
  setupServerWith(defaultTasks.lusCovid);

  cy.visit("/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "test").click();

  cy.task<string[]>("readdir", "../datasets/lus_covid/COVID+/").then((files) =>
    cy.get('[data-testid="select-image-button"]').first().selectFile(files),
  );
  cy.contains("button", "next").click();

  cy.contains("Validate your model")
    .parent()
    .parent()
    .contains("button", "test")
    .click();

  cy.contains("button", "download as csv", { timeout: 20_000 });
});

it("can start and stop testing of wikitext", () => {
  setupServerWith(defaultTasks.wikitext);

  cy.visit("/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "test").click();

  cy.get('[data-testid="select-text-button"]')
    .first()
    .selectFile("../datasets/wikitext/wiki.test.tokens");
  cy.contains("button", "next").click();

  cy.contains("Validate your model")
    .parent()
    .parent()
    .contains("button", "test")
    .click();
  cy.contains("button", "stop testing").click();
});
