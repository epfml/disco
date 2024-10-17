import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../../support/e2e";

it("stores models", () => {
  setupServerWith(defaultTasks.titanic);

  cy.visit("/#/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "test").should("exist");

  cy.reload();
  cy.contains("button", "test").should("exist");
});

it("stores larger models", () => {
  setupServerWith(defaultTasks.wikitext);

  cy.visit("/#/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "test")
    .should("exist")
    .then(
      () =>
        // storage takes time and no user feedback
        new Promise((resolve) => setTimeout(resolve, 300)),
    );

  cy.reload();
  cy.contains("button", "test").should("exist");
});
