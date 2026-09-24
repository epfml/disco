import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e.ts";

describe("not-found page", () => {
  it("is shown for an unknown task", () => {
    setupServerWith(defaultTasks.titanic);

    cy.visit("/not-a-task");
    cy.url().should("eq", `${Cypress.config().baseUrl}not-found`);
    cy.contains("404");
  });

  it("can be navigated away from", () => {
    setupServerWith(defaultTasks.titanic);

    cy.visit("/not-a-task");
    cy.contains("404");

    // the component of the unknown task is kept alive, it shouldn't redirect anymore
    cy.get('aside a[href="/list"]').click();
    cy.url().should("eq", `${Cypress.config().baseUrl}list`);
  });

  it("is not covered by the tutorial when leaving it", () => {
    setupServerWith(defaultTasks.titanic);

    cy.visit("/not-a-task");
    cy.contains("404");

    // the tutorial starts on the task list and overlays the whole page
    cy.get('aside a[href="/list"]').click();
    cy.get(".driver-popover");

    // going back leaves no overlay swallowing the clicks
    cy.go("back");
    cy.get(".driver-popover").should("not.exist");
    cy.get('aside a[href="/create"]').click();
    cy.url().should("eq", `${Cypress.config().baseUrl}create`);
  });
});
