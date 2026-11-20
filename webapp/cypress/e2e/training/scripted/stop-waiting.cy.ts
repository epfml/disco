import { defaultTasks, mtype } from "@epfml/discojs";
import type { federatedMessages } from "@epfml/discojs";
import { setupServerWith } from "../../../support/e2e";
import { goToTaskOverview } from "../../../support/training";

for (const waitingForParticipants of [true, false]) {
  it(`stops while waiting for ${waitingForParticipants ? "participants" : "aggregation"} and saves the partial model`, () => {
    setupServerWith(defaultTasks.titanic);
    const answer: federatedMessages.NewFederatedNodeInfo = {
      type: mtype.MType.NewFederatedNodeInfo,
      id: "node-id",
      waitForMoreParticipants: waitingForParticipants,
      payload: undefined,
      round: 0,
      nbOfParticipants: waitingForParticipants ? 1 : 2,
    };
    // Join succeeds, but no participant/aggregation response will ever arrive.
    cy.task("scriptServer", { [mtype.MType.ClientConnected]: [answer] });
    goToTaskOverview();
    cy.contains("button", "next").click();
    cy.get('[data-testid="select-tabular-button"]')
      .first()
      .selectFile("../datasets/titanic_train.csv");
    cy.contains("button", "next").click();
    cy.contains("button", "Start training").click();
    cy.contains(
      waitingForParticipants
        ? "Waiting for more participants"
        : "Updating the model with other participants' models",
      { timeout: 40_000 },
    ).scrollIntoView();
    cy.contains("button", "stop training").click();
    // An actual cancellation must finish before the old 10-second kill timeout.
    cy.contains("Training stopped", { timeout: 8_000 }).should("be.visible");
    cy.contains("button", "Start training").should("be.visible");
    cy.contains("button", "next").click();
    cy.contains("button", "save model").click();
    cy.contains("The trained Titanic Prediction model has been saved.").should(
      "be.visible",
    );
    cy.get(".v-toast__item--error").should("not.exist");
  });
}
