import { defaultTasks, serialization } from "@epfml/discojs";

describe("training page", () => {
  it("is navigable", () => {
    cy.intercept({ hostname: "server", pathname: "tasks" }, [
      defaultTasks.titanic.getTask(),
    ]);
    cy.visit("/");

    cy.contains("button", "get started").click();
    cy.contains("button", "explore").click();
    cy.contains("button", "participate").click();

    const navigationButtons = 3;
    for (let i = 0; i < navigationButtons; i++) {
      cy.contains("button", "next").click();
    }
    for (let i = 0; i < navigationButtons + 1; i++) {
      cy.contains("button", "previous").click();
    }
  });

  it("can train and test the model", () => {
    cy.intercept({ hostname: "server", pathname: "tasks" }, [
      defaultTasks.titanic.getTask(),
    ]);

    // cypress really wants to JSON encode our buffer.
    // to avoid that, we are replacing it directly in the response
    cy.intercept(
      { hostname: "server", pathname: "/tasks/titanic/model.json" },
      { statusCode: 200 },
    );
    cy.wrap<Promise<serialization.model.Encoded>, serialization.model.Encoded>(
      defaultTasks.titanic.getModel().then(serialization.model.encode),
    ).then((encoded) =>
      cy.intercept(
        { hostname: "server", pathname: "/tasks/titanic/model.json" },
        (req) =>
          req.on("response", (res) => {
            res.body = encoded;
          }),
      ),
    );

    cy.visit("/");

    cy.contains("button", "get started").click();
    cy.contains("button", "explore").click();
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
});
