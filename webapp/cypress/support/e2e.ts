import type {
  DataType,
  Model,
  Network,
  Task,
  TaskProvider,
  TrainingInformation,
} from "@epfml/discojs";
import { serialization } from "@epfml/discojs";

export function setupServerWith(
  ...providers: (Task<DataType, Network> | TaskProvider<DataType, Network>)[]
): void {
  cy.wrap(providers)
    .then((providers) =>
      Promise.all(
        providers.map(async (p) => {
          if ("id" in p) return [p, undefined] as const;
          return [await p.getTask(), await p.getModel()] as const;
        }),
      ),
    )
    .as("taskAndModels");

  cy.get<Array<[Task<DataType,Network>, unknown]>>("@taskAndModels")
    .then((taskAndModels) =>
      taskAndModels.map(([t]) => serialization.task.serializeToJSON(t)),
    )
    .then((tasks) =>
      cy.intercept({ hostname: "server", pathname: "tasks" }, tasks),
    );

  cy.get<Array<[Task<DataType, Network>, Model<DataType> | undefined]>>(
    "@taskAndModels",
  ).then((tasksAndModels) => {
    tasksAndModels.forEach(([task, model]) => {
      if (model === undefined) return;

      // cypress really wants to JSON encode our buffer.
      // to avoid that, we are replacing it directly in the response
      cy.intercept(
        { hostname: "server", pathname: `/tasks/${task.id}/model.json` },
        { statusCode: 200 },
      );
      cy.wrap<Promise<serialization.Encoded>, serialization.Encoded>(
        serialization.model.encode(model),
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
  });
}

type BasicKeys =
  | "epochs"
  | "batchSize"
  | "roundDuration"
  | "validationSplit"
  | "tensorBackend"
  | "scheme"
  | "aggregationStrategy";

export function basicTask<D extends DataType>(
	dataType: D,
	info: Omit<TrainingInformation<D, "local">, BasicKeys>,
): Task<D, "local"> {
	return {
		id: "task",
		dataType,
		trainingInformation: {
			epochs: 1,
			batchSize: 1,
			roundDuration: 1,
			validationSplit: 1,
			tensorBackend: "tfjs",
			scheme: "local",
			aggregationStrategy: "mean",
			...info,
		},
		displayInformation: {
			title: "task",
			summary: { preview: "preview", overview: "overview" },
		},
		// cast as typescript doesn't work well w/ generics
	} as Task<D, "local">;
}

before(() => {
	localStorage.debug = "discojs*,webapp*";
});
