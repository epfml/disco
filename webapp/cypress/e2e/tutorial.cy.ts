import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e.ts";

describe("tutorial", () => {
  it("is shown on the first visit only", () => {
    setupServerWith(defaultTasks.titanic);

    cy.visit("/list");
    cy.get(".driver-popover-close-btn").click();

    // having been shown is persisted, it shouldn't show up again on a new load
    cy.visit("/list");
    cy.contains("button", "participate"); // wait for the page to be loaded
    cy.get(".driver-popover").should("not.exist");
  });

  it("can still be started from the sidebar", () => {
    setupServerWith(defaultTasks.titanic);

    cy.visit("/list");
    cy.get(".driver-popover-close-btn").click();

    cy.get("#tuto-help-bttn").click();
    cy.get(".driver-popover");
  });
});
