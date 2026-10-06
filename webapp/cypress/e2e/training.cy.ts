import type { federatedMessages } from "@epfml/discojs";
import { defaultTasks, mtype } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e";

function goToTaskOverview() {
  cy.visit("/");
  cy.contains("a", "Start training").click();
  cy.get(".driver-popover-close-btn").click();
  cy.contains("button", "participate").click();
}

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

  it("can train titanic", () => {
    setupServerWith(defaultTasks.titanic);

    goToTaskOverview();
    cy.contains("button", "next").click();

    cy.contains("Drop CSV");
    cy.get('[data-testid="select-tabular-button"]')
      .first()
      .selectFile("../datasets/titanic_train.csv");
    cy.contains("button", "next").click();

    cy.contains("button", "locally").click();
    cy.contains("button", "Start training").click();
    cy.get(".v-toast__item--error", { timeout: 1_000 }).should("not.exist");
    cy.contains("h6", "epochs")
      .next({ timeout: 40_000 })
      .should("have.text", "10 / 10");
    cy.get(".v-toast__item--error", { timeout: 1_000 }).should("not.exist");
    cy.contains("button", "next").click();

    cy.contains("button", "test model").click();
    cy.get(".v-toast__item--error", { timeout: 1_000 }).should("not.exist");

    cy.location("pathname").should("eq", "/evaluate");
    cy.contains("Model Testing");
  });

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

  it("can start and stop training of lus_covid", () => {
    setupServerWith(defaultTasks.lusCovid);

    // throwing to stop training
    cy.on("uncaught:exception", (e) => !e.message.includes("stop training"));

    goToTaskOverview();
    cy.contains("button", "next").click();

    cy.task<string[]>("readdir", "../datasets/lus_covid/COVID+/").then(
      (files) =>
        cy
          .contains("h4", "COVID-Positive")
          .parents()
          .eq(1)
          .find('[data-testid="select-image-button"]')
          .selectFile(files),
    );
    cy.task<string[]>("readdir", "../datasets/lus_covid/COVID-/").then(
      (files) =>
        cy
          .contains("h4", "COVID-Negative")
          .parents()
          .eq(1)
          .find('[data-testid="select-image-button"]')
          .selectFile(files),
    );
    cy.contains("button", "next").click();

    cy.contains("button", "locally").click();
    cy.contains("button", "Start training").click();
    cy.contains("h6", "current batch")
      .next({ timeout: 40_000 })
      .should("have.text", "2");

    cy.contains("button", "stop training").click();
    cy.get(".v-toast__item--error", { timeout: 1_000 }).should("not.exist");
  });
});
