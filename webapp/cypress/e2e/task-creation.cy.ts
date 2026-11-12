import { deserializeTaskFromJSON, type Task } from "@epfml/discojs";

import * as tf from "@tensorflow/tfjs";

it("submits with tabular task", () => {
  cy.intercept(
    { hostname: "server", pathname: "tasks", method: "POST" },
    { statusCode: 200 },
  ).as("posted");

  cy.visit("/create");

  cy.get("form").should("be.visible"); // Wait for the form to be fully loaded

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
  cy.get("select[name='model.loss']").select("hinge");
  cy.get("select[name='model.optimizer.name']").select("sgd");
  cy.get("input[name='model.optimizer.learningRate']").type("0.01");

  cy.get("button[type='submit']").click();

  cy.wait("@posted")
    .its("request.body.task")
    .then(deserializeTaskFromJSON)
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
        aggregationStrategy: "mean",
        epochs: 10,
        batchSize: 5,
        roundDuration: 2,
        validationSplit: 0,
        minNbOfParticipants: 2,
        inputColumns: ["input"],
        categoricalColumns: {},
        outputColumn: "output",
        tensorBackend: "tfjs",
      },
    } satisfies Task<"tabular", "federated">);
});

for (const aggregation of [
  {
    scheme: "federated",
    aggregationStrategy: "byzantine",
    aggregationParams: { clippingRadius: 2.5, maxIterations: 3, beta: 0.8 },
  },
  {
    scheme: "decentralized",
    aggregationStrategy: "secure",
    aggregationParams: { maxShareValue: 250 },
    maxConnectionRetry: 3,
    maxPeerConnectionTime: 60_000,
    maxModelSyncTime: 30_000,
  },
] as const) {
  it(`submits with custom aggregation parameters (${aggregation.aggregationStrategy})`, () => {
    cy.intercept(
      { hostname: "server", pathname: "tasks", method: "POST" },
      { statusCode: 200 },
    ).as("posted");

    cy.visit("/create");

    cy.get("form").should("be.visible");

    cy.get("input[name='id']").type("aggregation-task");
    cy.get("select[name='dataType']").select("tabular");

    cy.get("input[name='displayInformation.title']").type("aggregation title");
    cy.get("input[name='displayInformation.summary.preview']").type("preview");
    cy.get("textarea[name='displayInformation.summary.overview']").type(
      "overview",
    );
    cy.contains("Example tabular data").within(() => {
      cy.contains("add example").click();
      cy.get("input[name='displayInformation.dataExample[0].name']").type(
        "name",
      );
      cy.get("input[name='displayInformation.dataExample[0].data']").type(
        "data",
      );
    });

    cy.get("select[name='trainingInformation.scheme']").select("decentralized");
    cy.get("select[name='trainingInformation.aggregationStrategy']").select(
      "secure",
    );
    cy.get("select[name='trainingInformation.scheme']").select("federated");
    cy.get("select[name='trainingInformation.aggregationStrategy']").should(
      "have.value",
      "mean",
    );
    cy.get(
      "select[name='trainingInformation.aggregationStrategy'] option[value='secure']",
    ).should("not.exist");
    cy.get("select[name='trainingInformation.aggregationStrategy']").select(
      "byzantine",
    );
    cy.get(
      "input[name='trainingInformation.aggregationParams.clippingRadius']",
    ).type("2.5");
    cy.get("select[name='trainingInformation.scheme']").select("decentralized");
    cy.get("select[name='trainingInformation.aggregationStrategy']").select(
      "secure",
    );
    cy.get(
      "input[name='trainingInformation.aggregationParams.maxShareValue']",
    ).type("250");
    cy.get("select[name='trainingInformation.scheme']").select(
      aggregation.scheme,
    );
    cy.get("select[name='trainingInformation.aggregationStrategy']").select(
      aggregation.aggregationStrategy,
    );
    for (const [key, value] of Object.entries(aggregation.aggregationParams)) {
      cy.get(
        `input[name='trainingInformation.aggregationParams.${key}']`,
      ).clear();
      cy.get(`input[name='trainingInformation.aggregationParams.${key}']`).type(
        String(value),
      );
    }

    cy.get("input[name='trainingInformation.epochs']").type("10");
    cy.get("input[name='trainingInformation.batchSize']").type("5");
    cy.get("input[name='trainingInformation.roundDuration']").type("2");
    cy.get("input[name='trainingInformation.validationSplit']").type("0");
    cy.get("input[name='trainingInformation.minNbOfParticipants']").type("2");
    cy.contains("Input columns names").within(() => {
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
          force: true,
        }),
      );
    cy.get("select[name='model.loss']").select("hinge");
    cy.get("select[name='model.optimizer.name']").select("sgd");
    cy.get("input[name='model.optimizer.learningRate']").type("0.01");

    cy.get("button[type='submit']").click();

    cy.wait("@posted")
      .its("request.body.task")
      .then(deserializeTaskFromJSON)
      .should("deep.equal", {
        id: "aggregation-task",
        dataType: "tabular",
        displayInformation: {
          title: "aggregation title",
          summary: {
            preview: "preview",
            overview: "overview",
          },
          dataExample: [{ name: "name", data: "data" }],
        },
        trainingInformation: {
          ...aggregation,
          epochs: 10,
          batchSize: 5,
          roundDuration: 2,
          validationSplit: 0,
          minNbOfParticipants: 2,
          inputColumns: ["input"],
          categoricalColumns: {},
          outputColumn: "output",
          tensorBackend: "tfjs",
        },
      });
  });
}

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
