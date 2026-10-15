import {
  assertNoErrorToast,
  goToTaskOverview,
} from "../../../support/training";

describe("decentralized webapp training", () => {
  it("trains MNIST across Chrome, Edge, and Firefox participants", () => {
    cy.env(["expectedBrowser"])
      .its("expectedBrowser")
      .should("equal", Cypress.browser.name);

    goToTaskOverview("mnist");
    cy.contains("button", "next").click();

    cy.contains("button", "group").click();
    cy.task<string[]>("readdir", "../datasets/CIFAR10").then((files) =>
      cy
        .contains("h4", "Group label: 0") // dummy labels for now
        .parents()
        .eq(1)
        .find('[data-testid="select-image-button"]')
        .selectFile(files),
    );
    cy.contains("button", "next").click();
    cy.contains("button", "collaboratively").click();
    cy.contains("button", "Start training").click();
    assertNoErrorToast();

    cy.env(["numberOfParticipants"]).then(({ numberOfParticipants = 4 }) => {
      cy.contains("h6", "number of participants")
        .next({ timeout: 120_000 })
        .should("have.text", `${numberOfParticipants}`);
    });
    cy.contains("h6", "epochs")
      .next({ timeout: 270_000 })
      .should("have.text", "20 / 20");
    cy.contains("h6", "Collaborative model sharing")
      .next({ timeout: 60_000 })
      .should("have.text", "10");
    cy.contains("Training successfully completed", { timeout: 30_000 });
    assertNoErrorToast();
  });
});
