import type { DataType, Network, TaskProvider } from "@epfml/discojs";

/** Small initial CI workload; retain the default model and preprocessing. */
export function shortTraining<D extends DataType, N extends Network>(
  provider: TaskProvider<D, N>,
): TaskProvider<D, N> {
  return {
    modelCard: provider.modelCard,
    async getTask() {
      const task = await provider.getTask();
      return {
        ...task,
        trainingInformation: {
          ...task.trainingInformation,
          epochs: 1,
          roundDuration: 1,
          batchSize: 1,
          validationSplit: 0,
        },
      };
    },
  };
}

export function goToTaskOverview(): void {
  cy.visit("/");
  cy.contains("a", "Start training").click();
  cy.get(".driver-popover-close-btn").click();
  cy.contains("button", "participate").click();
}

export function trainLocallyAndSave(title: string): void {
  cy.contains("button", "next").click();
  cy.contains("button", "locally").click();
  cy.contains("button", "Start training").click();
  cy.contains("Training successfully completed", { timeout: 120_000 }).should(
    "be.visible",
  );
  cy.contains("h6", "epochs").next().should("have.text", "1 / 1");
  cy.contains("button", "Start training").should("be.visible");
  cy.contains("button", "next").click();
  cy.contains("button", "save model").click();
  cy.contains(`The trained ${title} model has been saved.`, {
    timeout: 30_000,
  }).should("be.visible");
}
