import { Seq } from "immutable";

import type {
  Model,
  Task,
  TaskProvider,
  TrainingInformation,
} from "@epfml/discojs";
import { isTask, serialization } from "@epfml/discojs";

export function setupServerWith(...providers: (Task | TaskProvider)[]): void {
  const tasksAndModels: Seq.Indexed<[Task, Promise<Model> | undefined]> = Seq(
    providers,
  ).map((p) => {
    if (isTask(p)) return [p, undefined];
    return [p.getTask(), p.getModel()];
  });

  cy.intercept(
    { hostname: "server", pathname: "tasks" },
    tasksAndModels.map(([t]) => t).toArray(),
  );

  tasksAndModels.forEach(([task, model]) => {
    if (model === undefined) return;

    // cypress really wants to JSON encode our buffer.
    // to avoid that, we are replacing it directly in the response
    cy.intercept(
      { hostname: "server", pathname: `/tasks/${task.id}/model.json` },
      { statusCode: 200 },
    );
    cy.wrap<Promise<serialization.model.Encoded>, serialization.model.Encoded>(
      model.then(serialization.model.encode),
    ).then((encoded) =>
      cy.intercept(
        { hostname: "server", pathname: `/tasks/${task.id}/model.json` },
        (req) =>
          req.on("response", (res) => {
            res.body = encoded;
          }),
      ),
    );
  });
}

export function basicTask(
  info: Partial<TrainingInformation> & Pick<TrainingInformation, "dataType">,
): Task {
  return {
    id: "task",
    trainingInformation: {
      ...info,
      epochs: 1,
      batchSize: 1,
      roundDuration: 1,
      validationSplit: 1,
      tensorBackend: "tfjs",
      scheme: "local",
      minNbOfParticipants: 1,
    },
    displayInformation: {
      taskTitle: "task",
      summary: { preview: "preview", overview: "overview" },
    },
  };
}

beforeEach(
  () =>
    new Promise((resolve, reject) => {
      const req = window.indexedDB.deleteDatabase("tensorflowjs");
      req.onerror = reject;
      req.onsuccess = resolve;
    }),
);

beforeEach(() => { localStorage.debug = "discojs*,webapp*" });
