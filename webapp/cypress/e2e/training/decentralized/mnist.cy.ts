import { assertNoErrorToast } from "../../../support/training";

describe("decentralized webapp training", () => {
  it("trains MNIST across Chrome and Firefox participants", () => {
    cy.env(["expectedBrowser"])
      .its("expectedBrowser")
      .should("equal", Cypress.browser.name);

    cy.visit("/");
    cy.contains("a", "Start training").click();
    cy.get(".driver-popover-close-btn").click();
    cy.get("#mnist", { timeout: 30_000 })
      .contains("button", "participate")
      .click();
    cy.contains("button", "next").click();

    cy.contains("button", "group").click();
    cy.task<string[]>("readdir", "../datasets/CIFAR10").then((files) =>
      cy
        .contains("h4", "Group label: 0")
        .parents()
        .eq(1)
        .find('[data-testid="select-image-button"]')
        .selectFile(files),
    );
    cy.contains("button", "next").click();
    cy.contains("button", "collaboratively").click();
    cy.contains("button", "Start training").click();
    assertNoErrorToast();

    const expectedParticipants = Cypress.env("numberOfParticipants") ?? 4;

    cy.contains("h6", "number of participants")
      .next({ timeout: 270_000 })
      .should("have.text", `${expectedParticipants}`);
    cy.contains("h6", "epochs")
      .next({ timeout: 270_000 })
      .should("have.text", "20 / 20");
    cy.contains("h6", "Collaborative model sharing")
      .next({ timeout: 270_000 })
      .should("have.text", "10");
    cy.contains("Training successfully completed", { timeout: 270_000 });
    assertNoErrorToast();
  });
});
