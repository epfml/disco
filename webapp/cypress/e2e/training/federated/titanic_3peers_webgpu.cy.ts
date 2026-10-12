import { assertNoErrorToast } from "../../../support/training";

function goToTitanicTraining(): void {
  cy.visit("/?backend=webgpu");
  cy.window().its("tf").invoke("getBackend").should("equal", "webgpu");
  cy.contains("a", "Start training").click();
  cy.get(".driver-popover-close-btn").click();
  cy.contains("button", "participate").click();
  cy.contains("button", "next").click();
  cy.get('[data-testid="select-tabular-button"]')
    .first()
    .selectFile("../datasets/titanic_train.csv");
  cy.contains("button", "next").click();
}

describe("federated webapp training with 3 participants on WebGPU", () => {
  it("trains Titanic with two Node participants and one WebGPU browser participant through a real server", () => {
    goToTitanicTraining();

    cy.contains("button", "collaboratively").click();
    cy.contains("button", "Start training").click();
    assertNoErrorToast();

    cy.contains("h6", "number of participants")
      .next({ timeout: 240_000 })
      .should("have.text", "3");
    cy.contains("h6", "epochs")
      .next({ timeout: 240_000 })
      .should("have.text", "10 / 10");
    cy.contains("h6", "Collaborative model sharing")
      .next()
      .should("have.text", "5");
    cy.contains("Training successfully completed", { timeout: 240_000 });
    assertNoErrorToast();
  });
});
