export function goToTaskOverview(): void {
  cy.visit("/");
  cy.contains("a", "Start training").click();
  cy.get(".driver-popover-close-btn").click();
  cy.contains("button", "participate").click();
}

export function trainLocallyAndSave(
  title: string,
  epochs: number,
  trainingTimeout = 120_000,
): void {
  cy.contains("button", "next").click();
  cy.contains("button", "locally").click();
  cy.contains("button", "Start training").click();
  cy.contains("Training successfully completed", {
    timeout: trainingTimeout,
  }).should("be.visible");
  cy.contains("h6", "epochs")
    .next()
    .should("have.text", `${epochs} / ${epochs}`);
  cy.contains("button", "Start training").should("be.visible");
  cy.contains("button", "next").click();
  cy.contains("button", "save model").click();
  cy.contains(`The trained ${title} model has been saved.`, {
    timeout: 30_000,
  }).should("be.visible");
}
