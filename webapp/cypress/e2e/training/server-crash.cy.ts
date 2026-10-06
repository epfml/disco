import type { federatedMessages } from "@epfml/discojs";
import { defaultTasks, mtype } from "@epfml/discojs";

import { setupServerWith } from "../../support/e2e";
import { goToTaskOverview } from "../../support/training";

describe("training page", () => {
  it("tells the user when the server make the client crash stops the training", () => {
    setupServerWith(defaultTasks.titanic);

    // Create the server responses for joining and crashing the client
    const joinAnswer: federatedMessages.NewFederatedNodeInfo = {
      type: mtype.MType.NewFederatedNodeInfo,
      id: "node-id",
      waitForMoreParticipants: false,
      payload: undefined,
      round: 0,
      nbOfParticipants: 1,
    };
    const crash: mtype.CrashClient = {
      type: mtype.MType.CrashClient,
      reason: "crash",
    };

    // Script the server to first acknowledge the client connection and then crash it
    cy.task("scriptServer", {
      [mtype.MType.ClientConnected]: [joinAnswer],
      [mtype.MType.SendPayload]: [crash],
    });

    goToTaskOverview();
    cy.contains("button", "next").click();

    cy.contains("Drop CSV");
    cy.get('[data-testid="select-tabular-button"]')
      .first()
      .selectFile("../datasets/titanic_train.csv");
    cy.contains("button", "next").click();

    cy.contains("button", "collaboratively").click();
    cy.contains("button", "Start training").click();
    cy.contains(".v-toast__item--error", "The server stopped your training.", {
      timeout: 40_000,
    });
  });
});
