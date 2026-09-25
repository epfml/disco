function goToTitanicTraining(): void {
  cy.visit("/");
  cy.contains("a", "Start training").click();
  cy.get(".driver-popover-close-btn").click();
  cy.contains("button", "participate").click();
  cy.contains("button", "next").click();
  cy.get('[data-testid="select-tabular-button"]')
    .first()
    .selectFile("../datasets/titanic_train.csv");
  cy.contains("button", "next").click();
}

describe("federated webapp training", () => {
  afterEach(() => cy.task("stopFederatedParticipant"));

  it("trains Titanic with a Node participant through a real server", () => {
    goToTitanicTraining();

    cy.task("startFederatedParticipant");
    cy.contains("button", "collaboratively").click();
    cy.contains("button", "Start training").click();

    cy.contains("h6", "number of participants")
      .next({ timeout: 240_000 })
      .should("have.text", "2");
    cy.contains("h6", "epochs")
      .next({ timeout: 240_000 })
      .should("have.text", "10 / 10");
    cy.contains("h6", "Collaborative model sharing")
      .next()
      .should("have.text", "5");
    cy.contains("Training successfully completed");

    cy.task<ParticipantResult>("awaitFederatedParticipant", null, {
      timeout: 240_000,
    }).should("deep.equal", { rounds: 5, epochs: 10 });
  });
});

interface ParticipantResult {
  readonly rounds: number;
  readonly epochs: number;
}
