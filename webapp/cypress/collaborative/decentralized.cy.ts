interface TrainingPeerResult {
  readonly rounds: number;
  readonly epochs: number;
}

describe("decentralized browser training", () => {
  afterEach(() => cy.task("stopDecentralizedTrainingPeers"));

  it("trains MNIST with two Node participants through the webapp", () => {
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

    cy.task("startDecentralizedTrainingPeers");
    cy.contains("button", "collaboratively").click();
    cy.contains("button", "Start training").click();

    cy.contains("h6", "number of participants")
      .next({ timeout: 270_000 })
      .should("have.text", "3");
    cy.contains("h6", "epochs")
      .next({ timeout: 270_000 })
      .should("have.text", "20 / 20");
    cy.contains("h6", "Collaborative model sharing")
      .next()
      .should("have.text", "10");
    cy.contains("Training successfully completed");

    cy.task<TrainingPeerResult[]>("awaitDecentralizedTrainingPeers", null, {
      timeout: 270_000,
    }).should("deep.equal", [
      { rounds: 10, epochs: 20 },
      { rounds: 10, epochs: 20 },
    ]);
  });
});
