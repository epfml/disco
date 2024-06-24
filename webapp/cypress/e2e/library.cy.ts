import * as tf from "@tensorflow/tfjs";

import type { TaskProvider } from "@epfml/discojs";
import { defaultTasks, serialization } from "@epfml/discojs";
import { expect } from "chai";

// we can't test via component stubs as it requires IndexedDB

describe("model library", () => {
  beforeEach(
    () =>
      new Promise((resolve, reject) => {
        const req = window.indexedDB.deleteDatabase("tensorflowjs");
        req.onerror = reject;
        req.onsuccess = resolve;
      }),
  );

  function setupForTask(taskProvider: TaskProvider): void {
    cy.intercept({ hostname: "server", pathname: "/tasks" }, (req) => {
      const task = taskProvider.getTask();
      task.trainingInformation.epochs = 3;
      req.reply([task]);
    });

    // reasoning in training.cy.ts
    cy.intercept(
      { hostname: "server", pathname: "/tasks/titanic/model.json" },
      { statusCode: 200 },
    );
    cy.wrap<Promise<serialization.model.Encoded>, serialization.model.Encoded>(
      taskProvider.getModel().then(serialization.model.encode),
    ).then((encoded) =>
      cy.intercept(
        { hostname: "server", pathname: "/tasks/titanic/model.json" },
        (req) =>
          req.on("response", (res) => {
            res.body = encoded;
          }),
      ),
    );
  }

  /** Ensure that downloaded model is TFJS and trainable */
  function expectDownloadOfTFJSModelIsTrainable(modelName: string): void {
    const folder = Cypress.config("downloadsFolder");
    cy.readFile(`${folder}/titanic_titanic-model.json`).then((content) =>
      cy.intercept(
        { hostname: "downloads", pathname: `/${modelName}.json` },
        content,
      ),
    );
    cy.readFile(`${folder}/${modelName}.weights.bin`).then((content) =>
      cy.intercept(
        {
          hostname: "downloads",
          pathname: `/${modelName}.weights.bin`,
        },
        content,
      ),
    );

    cy.wrap({ loadModel: tf.loadLayersModel })
      .invoke("loadModel", `http://downloads/${modelName}.json`)
      .then((promise) => promise)
      .then((model) => {
        const [input, output] = [model.input, model.output];
        if (Array.isArray(input) || Array.isArray(output))
          throw new Error("only support single input & output");

        return model.fit(
          tf.ones(input.shape.map((s) => (s === null ? 1 : s))),
          tf.ones(output.shape.map((s) => (s === null ? 1 : s))),
          {
            epochs: 3,
          },
        );
      })
      .should((history) => expect(history.epoch).to.have.lengthOf(3));
  }

  it("allows downloading of server models", () => {
    setupForTask(defaultTasks.titanic);

    cy.visit("/#/evaluate");
    cy.contains("button", "download").click();

    cy.get('[data-title="Model Library"]').click();
    cy.contains("titanic-model").get('button[title="Download"]').click();

    expectDownloadOfTFJSModelIsTrainable("titanic_titanic-model");
  });

  it("store trained model", () => {
    setupForTask(defaultTasks.titanic);

    cy.visit("/#/titanic");
    cy.contains("button", "next").click();

    cy.contains("label", "select CSV").selectFile(
      "../datasets/titanic_train.csv",
    );
    cy.contains("button", "next").click();

    cy.contains("button", "train alone").click();
    cy.contains("h6", "current round")
      .next({ timeout: 10_000 })
      .should("have.text", "3");
    cy.contains("button", "next").click();

    // TODO do not save by default, only via "save model" button

    // TODO be reactive
    cy.visit("/#/evaluate"); // force refresh

    cy.get('[data-title="Model Library"]').click();
    cy.contains("titanic-model").get('button[title="Download"]').click();

    expectDownloadOfTFJSModelIsTrainable("titanic_titanic-model");
  });
});
