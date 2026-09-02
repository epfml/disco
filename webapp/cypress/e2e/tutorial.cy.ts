import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e.ts";

// The element highlighted by each step of the tutorial, in order.
// `undefined` for the steps that only display a centered popover.
const STEPS = [
  "#tuto-help-bttn",
  undefined,
  "#llm_task",
  "#tuto-create-bttn",
  "#tuto-evaluate-bttn",
  "#lus_covid",
  undefined,
  "#tuto-training-bar",
  ".tuto-data-desc",
  ".tuto-example-data",
  "#tuto-group-bttn",
  ".group-data-field",
  ".tuto-train-dash",
  "#train-collab-bttn",
  "#train-locally-bttn",
  undefined,
  "#tuto-evaluate-bttn",
  "#tuto-slack-link",
];

function expectStep(index: number): void {
  cy.get(".driver-popover-progress-text").should(
    "have.text",
    `Step ${index + 1} of ${STEPS.length}`,
  );
  const selector = STEPS[index];
  if (selector === undefined) return;
  cy.get(selector)
    .should("have.class", "driver-active-element")
    // the highlighted element has to be rendered: the elements of another
    // training step are in the DOM but hidden, hence have no dimension
    .and(($element) => {
      expect(
        $element[0].getBoundingClientRect().height,
        `${selector} is displayed`,
      ).to.be.greaterThan(0);
    });
}

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

    // the skipped first step isn't reachable by going back
    cy.get(".driver-popover-prev-btn").should("be.disabled");
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
  it("can be navigated back and forth", () => {
    setupServerWith(defaultTasks.lusCovid, defaultTasks.wikitext);

    cy.visit("/list");

    // "previous" is disabled on the first step
    cy.get(".driver-popover-prev-btn").should("be.disabled");

    // go through the whole tutorial
    for (let index = 0; index < STEPS.length; index++) {
      expectStep(index);
      if (index < STEPS.length - 1) cy.get(".driver-popover-next-btn").click();
    }
    cy.url().should("match", /\/lus_covid$/);

    // go back to the beginning
    for (let index = STEPS.length - 1; index >= 0; index--) {
      expectStep(index);
      if (index > 0) cy.get(".driver-popover-prev-btn").click();
    }
    cy.url().should("match", /\/list$/);

    // and go the the end again
    for (let index = 0; index < STEPS.length; index++) {
      expectStep(index);
      cy.get(".driver-popover-next-btn").click();
    }

    // the last step closes the tutorial and goes back to the task list
    cy.get(".driver-popover").should("not.exist");
    cy.url().should("match", /\/list$/);
  });
});
