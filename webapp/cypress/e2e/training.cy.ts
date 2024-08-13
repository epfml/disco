import type { TaskProvider } from "@epfml/discojs";
import { defaultTasks, serialization } from "@epfml/discojs";

describe("training page", () => {
  it("is navigable", () => {
    cy.intercept({ hostname: "server", pathname: "tasks" }, [
      defaultTasks.titanic.getTask(),
    ]);
    cy.visit("/");

    cy.contains("button", "get started").click();
    cy.contains("button", "participate").click();
    cy.contains("button", "participate").click();

    const navigationButtons = 3;
    for (let i = 0; i < navigationButtons; i++) {
      cy.contains("button", "next").click();
    }
    for (let i = 0; i < navigationButtons + 1; i++) {
      cy.contains("button", "previous").click();
    }
  });

  function setupServertWith(tp: TaskProvider): void {
    const id = tp.getTask().id;

    cy.intercept({ hostname: "server", pathname: "tasks" }, [tp.getTask()]);

    // cypress really wants to JSON encode our buffer.
    // to avoid that, we are replacing it directly in the response
    cy.intercept(
      { hostname: "server", pathname: `/tasks/${id}/model.json` },
      { statusCode: 200 },
    );
    cy.wrap<Promise<serialization.model.Encoded>, serialization.model.Encoded>(
      tp.getModel().then(serialization.model.encode),
    ).then((encoded) =>
      cy.intercept(
        { hostname: "server", pathname: `/tasks/${id}/model.json` },
        (req) =>
          req.on("response", (res) => {
            res.body = encoded;
          }),
      ),
    );
  }

  it("can train titanic", () => {
    setupServertWith(defaultTasks.titanic);

    cy.visit("/");

    cy.contains("button", "get started").click();
    cy.contains("button", "participate").click();
    cy.contains("button", "participate").click();
    cy.contains("button", "next").click();

    cy.contains("label", "select CSV").selectFile(
      "../datasets/titanic_train.csv",
    );
    cy.contains("button", "next").click();

    cy.contains("button", "train alone").click();
    cy.contains("h6", "epochs")
      .next({ timeout: 40_000 })
      .should("have.text", "10 / 10");
    cy.contains("button", "next").click();

    cy.contains("button", "test model").click();
  });

  it("can start and stop training of lus_covid", () => {
    setupServertWith(defaultTasks.lusCovid);

    // throwing to stop training
    cy.on("uncaught:exception", (e) => !e.message.includes("stop training"));

    cy.visit("/");

    cy.contains("button", "get started").click();
    cy.contains("button", "participate").click();
    cy.contains("button", "participate").click();
    cy.contains("button", "next").click();

    cy.task<string[]>("readdir", "../datasets/lus_covid/COVID+/").then(
      (files) =>
        cy
          .contains("h4", "COVID-Positive")
          .parents()
          .contains("select images")
          .selectFile(files),
    );
    cy.task<string[]>("readdir", "../datasets/lus_covid/COVID-/").then(
      (files) =>
        cy
          .contains("h4", "COVID-Negative")
          .parents()
          .contains("select images")
          .selectFile(files),
    );
    cy.contains("button", "next").click();

    cy.contains("button", "train alone").click();
    cy.contains("h6", "current batch")
      .next({ timeout: 40_000 })
      .should("have.text", "2");

    cy.contains("button", "stop training").click();
  });
});
