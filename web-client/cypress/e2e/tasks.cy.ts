import { defaultTasks } from "@epfml/discojs-core";

describe("tasks page", () => {
  it("displays tasks", () => {
    cy.intercept({ hostname: "server", pathname: "tasks" }, [
      defaultTasks.titanic.getTask(),
      defaultTasks.mnist.getTask(),
      defaultTasks.geotags.getTask(),
    ]);
    cy.visit("/#/list");

    cy.get('div[id="tasks"]').children().should("have.length", 3);
  });

  it("redirects to training", () => {
    cy.intercept({ hostname: "server", pathname: "tasks" }, [
      defaultTasks.titanic.getTask(),
    ]);
    cy.visit("/#/list");

    cy.get(`div[id="titanic"]`).find("button").click();
    cy.url().should("eq", `${Cypress.config().baseUrl}#/titanic`);

    cy.contains("button", "previous").click();
    cy.url().should("eq", `${Cypress.config().baseUrl}#/list`);
  });

  it("displays error message", () => {
    cy.intercept(
      { hostname: "server", pathname: "tasks" },
      { statusCode: 404 },
    );

    cy.visit("/#/list");
    cy.contains("button", "reload page");
  });
});
