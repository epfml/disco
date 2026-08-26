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

  it("shows a single popover when started while navigating to the task list", () => {
    setupServerWith(defaultTasks.titanic);

    // starting from another page navigates to the task list, whose mounting
    // shouldn't start the tutorial a second time
    cy.visit("/");
    cy.get("#tuto-help-bttn").click();

    cy.contains(".driver-popover-title", "Welcome to DISCO!");
    cy.get(".driver-popover").should("have.length", 1);
  });

  it("only closes when clicking on the cross", () => {
    setupServerWith(defaultTasks.titanic);

    cy.visit("/list");
    cy.get(".driver-popover");

    // clicking outside of the popover is most likely a misclick, it shouldn't close
    cy.get(".driver-overlay").click({ force: true });
    cy.get(".driver-popover");

    cy.get(".driver-popover-close-btn").click();
    cy.get(".driver-popover").should("not.exist");
  });

  it("displays the current step and the total number of steps", () => {
    setupServerWith(defaultTasks.titanic);

    cy.visit("/list");
    cy.get(".driver-popover-progress-text").should("contain", "Step 1 of");
    cy.get(".driver-popover-next-btn").click();
    cy.get(".driver-popover-progress-text").should("contain", "Step 2 of");

    cy.get(".driver-popover-close-btn").click();

    // the first step is skipped when starting from the sidebar,
    // it shouldn't be counted
    cy.get("#tuto-help-bttn").click();
    cy.contains(".driver-popover-title", "Welcome to DISCO!");
    cy.get(".driver-popover-progress-text").should("contain", "Step 1 of");
  });
});
