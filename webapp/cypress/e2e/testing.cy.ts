import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e";

it("can test titanic", () => {
  setupServerWith(defaultTasks.titanic);

  cy.visit("/#/evaluate");
  cy.contains("button", "download").click();

  cy.contains("titanic-model").parents().contains("button", "test").click();

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

  cy.contains("lus-covid-model").parents().contains("button", "test").click();

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

it("can start and stop training of wikitext", () => {
  setupServerWith(defaultTasks.wikitext);

  cy.visit("/#/evaluate");
  cy.contains("button", "download").click();

  cy.contains("llm-raw-model").parents().contains("button", "test").click();

  cy.contains("label", "select text").selectFile(
    "../datasets/wikitext/wiki.test.tokens",
  );
  cy.contains("button", "next").click();

  cy.contains("Test & validate")
    .parent()
    .parent()
    .contains("button", "test")
    .click();
  cy.contains("button", "stop testing").click();
});
