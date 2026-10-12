import type {
  DataType,
  Network,
  TaskProvider,
  TrainingInformation,
} from "@epfml/discojs";

export function withTrainingConfig<D extends DataType, N extends Network>(
  provider: TaskProvider<D, N>,
  trainingConfig: Partial<TrainingInformation<D, N>>,
): TaskProvider<D, N> {
  return {
    modelCard: provider.modelCard,
    async getTask() {
      const task = await provider.getTask();
      return {
        ...task,
        trainingInformation: {
          ...task.trainingInformation,
          ...trainingConfig,
        },
      };
    },
  };
}

export function goToTaskOverview(url = "/"): void {
  cy.visit(url);
  cy.contains("a", "Start training").click();
  cy.get(".driver-popover-close-btn").click();
  cy.contains("button", "participate").click();
}

export function assertNoErrorToast(): void {
  cy.get(".v-toast__item--error", { timeout: 1_000 }).should("not.exist");
}

export function trainLocallyAndSave(
  title: string,
  epochs: number,
  trainingTimeout = 120_000,
): void {
  cy.contains("button", "next").click();
  cy.contains("button", "locally").click();
  cy.contains("button", "Start training").click();
  assertNoErrorToast();
  cy.contains("Training successfully completed", {
    timeout: trainingTimeout,
  }).should("be.visible");
  assertNoErrorToast();
  cy.contains("h6", "epochs")
    .next()
    .should("have.text", `${epochs} / ${epochs}`);
  cy.contains("button", "Start training").should("be.visible");
  cy.contains("button", "next").click();
  cy.contains("button", "save model").click();
  cy.contains(`The trained ${title} model has been saved.`, {
    timeout: 30_000,
  }).should("be.visible");
  assertNoErrorToast();
}
