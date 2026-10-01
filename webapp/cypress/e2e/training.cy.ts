import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e";
import { goToTaskOverview } from "../support/training";

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
});
