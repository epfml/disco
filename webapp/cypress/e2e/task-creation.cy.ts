import { serialization, type Task } from "@epfml/discojs";

import * as tf from "@tensorflow/tfjs";

it("submits with tabular task", () => {
  cy.intercept(
    { hostname: "server", pathname: "tasks", method: "POST" },
    { statusCode: 200 },
  ).as("posted");

  cy.visit("/#/create");

  cy.get("input[name='id']").type("id");
  cy.get("select[name='dataType']").select("tabular");

  cy.get("input[name='displayInformation.title']").type("simple");
  cy.get("input[name='displayInformation.summary.preview']").type("preview");
  cy.get("textarea[name='displayInformation.summary.overview']").type(
    "overview",
  );
  cy.contains("Example tabular data").within(() => {
    cy.contains("add example").click();
    cy.get("input[name='displayInformation.dataExample[0].name']").type("name");
    cy.get("input[name='displayInformation.dataExample[0].data']").type("data");
  });

  cy.get("select[name='trainingInformation.scheme']").select("federated");
  cy.get("input[name='trainingInformation.epochs']").type("10");
  cy.get("input[name='trainingInformation.batchSize']").type("5");
  cy.get("input[name='trainingInformation.roundDuration']").type("2");
  cy.get("input[name='trainingInformation.validationSplit']").type("0");
  cy.get("input[name='trainingInformation.minNbOfParticipants']").type("2");
  cy.contains("Input columns names").within(() => {
    cy.contains("add column").click();
    cy.get("input[name='trainingInformation.inputColumns[0]']").type("input");
  });
  cy.get("input[name='trainingInformation.outputColumn']").type("output");

  const model = tf.sequential({
    layers: [
      tf.layers.conv2d({
        inputShape: [32, 32, 3],
        kernelSize: 3,
        filters: 16,
        activation: "relu",
      }),
    ],
  });
  model.compile({ loss: "hinge", optimizer: "sgd" });
  cy.wrap(getArtifacts(model))
    .then((artifacts) => JSON.stringify(artifacts))
    .then((json) => new TextEncoder().encode(json))
    .then((raw) =>
      cy.get("input[type='file']").selectFile(new Uint8Array(raw), {
        force: true, // input is hidden
      }),
    );
  cy.get("input[name='model.loss']").type("hinge");
  cy.get("input[name='model.optimizer']").type("sgd");

  cy.get("button[type='submit']").click();

  cy.wait("@posted")
    .its("request.body.task")
    .then(serialization.task.decode)
    .should("deep.equal", {
      id: "id",
      dataType: "tabular",
      displayInformation: {
        title: "simple",
        summary: {
          preview: "preview",
          overview: "overview",
        },
        dataExample: [{ name: "name", data: "data" }],
      },
      trainingInformation: {
        scheme: "federated",
        epochs: 10,
        batchSize: 5,
        roundDuration: 2,
        validationSplit: 0,
        minNbOfParticipants: 2,
        inputColumns: ["input"],
        outputColumn: "output",
        tensorBackend: "tfjs",
      },
    } satisfies Task<"tabular">);
});

async function getArtifacts(
  model: tf.LayersModel,
): Promise<tf.io.ModelArtifacts & { weightsManifest: never[] }> {
  let resolveArtifacts: (_: tf.io.ModelArtifacts) => void;
  const ret = new Promise<tf.io.ModelArtifacts>((resolve) => {
    resolveArtifacts = resolve;
  });

  await model.save(
    {
      save: (artifacts) => {
        resolveArtifacts(artifacts);
        return Promise.resolve({
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: "JSON",
          },
        });
      },
    },
    { includeOptimizer: true },
  );

  return {
    ...(await ret),
    weightsManifest: [], // required by tf.loadLayersModel
  };
}
