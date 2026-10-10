import type {
  DataType,
  Network,
  TaskProvider,
  TrainingInformation,
} from "@epfml/discojs";

export function withTrainingConfig<D extends DataType, N extends Network>(
  provider: TaskProvider<D, N>,
  trainingConfig: Pick<TrainingInformation<D, N>, "epochs" | "roundDuration">,
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

export function goToTaskOverview(): void {
  cy.visit("/");
  cy.contains("a", "Start training").click();
  cy.get(".driver-popover-close-btn").click();
  cy.contains("button", "participate").click();
}

export function assertNoErrorToast(): void {
  cy.get(".v-toast__item--error", { timeout: 1_000 }).should("not.exist");
}
