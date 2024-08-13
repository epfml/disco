import { expect } from "chai";
import * as tf from "@tensorflow/tfjs";

import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e.ts";

// we can't test via component stubs as it requires IndexedDB

describe("model library", () => {
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
    setupServerWith(defaultTasks.titanic);

    cy.visit("/#/evaluate");
    cy.contains("button", "download").click();

    cy.get("#model-library-btn").click();
    cy.contains("titanic-model").get('button[title="Download"]').click();

    expectDownloadOfTFJSModelIsTrainable("titanic_titanic-model");
  });

  it("store trained model", () => {
    setupServerWith({
      getTask() {
        const task = defaultTasks.titanic.getTask();
        task.trainingInformation.epochs =
          task.trainingInformation.roundDuration = 3;
        return task;
      },
      getModel: defaultTasks.titanic.getModel,
    });

    // Wait for tasks to load
    cy.visit("/#/list").contains("button", "participate", { timeout: 5000 });

    cy.visit("/#/titanic");
    cy.contains("button", "next").click();

    cy.contains("label", "select CSV").selectFile(
      "../datasets/titanic_train.csv",
    );
    cy.contains("button", "next").click();

    cy.contains("button", "train alone").click();
    cy.contains("h6", "epochs")
      .next({ timeout: 10_000 })
      .should("have.text", "3 / 3");
    cy.contains("button", "next").click();

    // TODO do not save by default, only via "save model" button

    // TODO be reactive
    cy.visit("/#/evaluate"); // force refresh

    cy.get("#model-library-btn").click();
    cy.contains("titanic-model").get('button[title="Download"]').click();

    expectDownloadOfTFJSModelIsTrainable("titanic_titanic-model");
  });
});
