import {
  deserializeTaskFromJSON,
  type DataType,
  type Network,
  type Task,
} from "@epfml/discojs";

import * as tf from "@tensorflow/tfjs";

/** ID that the stubbed server gives to the created task */
const serverID = "the-id";

/** Deserialize a posted task, which has no ID, with the one the server gives */
async function withServerID(
  definition: object,
): Promise<Task<DataType, Network>> {
  expect(definition).not.to.have.property("id"); // the server picks it
  return await deserializeTaskFromJSON({ ...definition, id: serverID });
}

it("submits with tabular task", () => {
  visitAndFillTabularTaskBasics("simple");

  cy.get("select[name='trainingInformation.scheme']").select("federated");
  fillRemainingTabularFieldsAndSubmit();

  cy.wait("@posted")
    .its("request.body.task")
    .then(withServerID)
    .should("deep.equal", {
      id: serverID,
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

it("shows the link of a private task instead of the form", () => {
  visitAndFillTabularTaskBasics("simple", {
    id: serverID,
    token: "the-token",
  });
  cy.get("select[name='trainingInformation.scheme']").select("federated");
  cy.contains("label", "Private").find("input[type='checkbox']").check();
  cy.contains("Only the people you give it to");
  fillRemainingTabularFieldsAndSubmit();

  cy.wait("@posted").its("request.body.private").should("equal", true);
  cy.get("#private-link").should(
    "have.value",
    `${Cypress.config().baseUrl}${serverID}#token=the-token`,
  );
  // the link is shown once, the form isn't there to submit the task twice
  cy.get("form").should("not.be.visible");
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
    visitAndFillTabularTaskBasics("aggregation title");

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

    fillRemainingTabularFieldsAndSubmit();

    cy.wait("@posted")
      .its("request.body.task")
      .then(withServerID)
      .should("deep.equal", {
        id: serverID,
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

it("does not submit aggregationParams when switching from byzantine to mean", () => {
  visitAndFillTabularTaskBasics("aggregation reset title");

  cy.get("select[name='trainingInformation.scheme']").select("federated");
  cy.get("select[name='trainingInformation.aggregationStrategy']").select(
    "byzantine",
  );
  cy.get(
    "input[name='trainingInformation.aggregationParams.clippingRadius']",
  ).type("2.5");
  cy.get(
    "input[name='trainingInformation.aggregationParams.maxIterations']",
  ).type("3");
  cy.get("input[name='trainingInformation.aggregationParams.beta']").type(
    "0.8",
  );

  cy.get("select[name='trainingInformation.aggregationStrategy']").select(
    "mean",
  );
  cy.get(
    "input[name='trainingInformation.aggregationParams.clippingRadius']",
  ).should("not.exist");

  fillRemainingTabularFieldsAndSubmit();

  cy.wait("@posted")
    .its("request.body.task.trainingInformation")
    .should("not.have.property", "aggregationParams");

  cy.get("@posted")
    .its("request.body.task")
    .then(withServerID)
    .should("deep.equal", {
      id: serverID,
      dataType: "tabular",
      displayInformation: {
        title: "aggregation reset title",
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
    aggregationParams: { clippingRadius: 1.0, maxIterations: 1, beta: 0.9 },
  },
  {
    scheme: "decentralized",
    aggregationStrategy: "secure",
    aggregationParams: { maxShareValue: 100 },
    maxConnectionRetry: 3,
    maxPeerConnectionTime: 60_000,
    maxModelSyncTime: 30_000,
  },
] as const) {
  it(`falls back to default aggregation parameters (${aggregation.aggregationStrategy})`, () => {
    visitAndFillTabularTaskBasics("aggregation default title");

    cy.get("select[name='trainingInformation.scheme']").select(
      aggregation.scheme,
    );
    cy.get("select[name='trainingInformation.aggregationStrategy']").select(
      aggregation.aggregationStrategy,
    );
    for (const key of Object.keys(aggregation.aggregationParams)) {
      cy.get(
        `input[name='trainingInformation.aggregationParams.${key}']`,
      ).should("have.value", "");
    }

    fillRemainingTabularFieldsAndSubmit();

    cy.wait("@posted")
      .its("request.body.task.trainingInformation.aggregationParams")
      .should("deep.equal", aggregation.aggregationParams);

    cy.get("@posted")
      .its("request.body.task")
      .then(withServerID)
      .should("deep.equal", {
        id: serverID,
        dataType: "tabular",
        displayInformation: {
          title: "aggregation default title",
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

/**
 * Open the creation form, stubbing the server's answer to its POST with the
 * given body, and fill the fields shared by every tabular task
 */
function visitAndFillTabularTaskBasics(
  title: string,
  answer: object = { id: serverID },
): void {
  cy.intercept(
    { hostname: "server", pathname: "tasks", method: "POST" },
    { statusCode: 200, body: answer },
  ).as("posted");

  cy.visit("/create");

  cy.get("form").should("be.visible"); // Wait for the form to be fully loaded

  cy.get("select[name='dataType']").select("tabular");

  cy.get("input[name='displayInformation.title']").type(title);
  cy.get("input[name='displayInformation.summary.preview']").type("preview");
  cy.get("textarea[name='displayInformation.summary.overview']").type(
    "overview",
  );
  cy.contains("Example tabular data").within(() => {
    cy.contains("add example").click();
    cy.get("input[name='displayInformation.dataExample[0].name']").type("name");
    cy.get("input[name='displayInformation.dataExample[0].data']").type("data");
  });
}

function fillRemainingTabularFieldsAndSubmit(): void {
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
