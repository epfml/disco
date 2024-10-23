import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e";

it("can test titanic", () => {
  setupServerWith(defaultTasks.titanic);

  cy.visit("/#/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "test").click();

  cy.contains("label", "select CSV").selectFile(
    "../datasets/titanic_train.csv",
  );
  cy.contains("button", "next").click();

  cy.contains("Test & validate")
    .parent()
    .parent()
    .contains("button", "test")
    .click();

  cy.contains("button", "download as csv");
});

it("can test lus_covid", () => {
  setupServerWith(defaultTasks.lusCovid);

  cy.visit("/#/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "test").click();

  cy.task<string[]>("readdir", "../datasets/lus_covid/COVID+/").then((files) =>
    cy.contains("label", "select images").selectFile(files),
  );
  cy.contains("button", "next").click();

  cy.contains("Test & validate")
    .parent()
    .parent()
    .contains("button", "test")
    .click();

  cy.contains("button", "download as csv", { timeout: 10_000 });
});

it("can start and stop testing of wikitext", () => {
  setupServerWith(defaultTasks.wikitext);
  cy.visit("/#/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "test").click();
  
  // input the dataset
  cy.contains("label", "select text").selectFile(
    "../datasets/wikitext/wiki.test.tokens",
  );
  
  // NOTE: internet connection needed
  // wait for the tokenizer to load and the filename to display
  // otherwise the training starts before the dataset is ready
  cy.contains("Connect your data")
  .parent()
  .parent()
  .contains("wiki.test.tokens", { timeout: 20_000 });

  cy.contains("button", "next").click();
  
  cy.get('[data-cy="start-test"]').click()

  cy.get('[data-cy="stop-test"]')
    .click({ waitForAnimations: false });
});
