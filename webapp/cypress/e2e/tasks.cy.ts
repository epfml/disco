import { defaultTasks } from "@epfml/discojs";

describe("tasks page", () => {
  it("displays tasks", () => {
    cy.intercept({ hostname: "server", pathname: "tasks" }, [
      defaultTasks.titanic.getTask(),
      defaultTasks.mnist.getTask(),
      defaultTasks.lusCovid.getTask(),
      defaultTasks.wikitext.getTask(),
    ]);
    cy.visit("/#/list").contains("button", "participate");

    // Length 5 = 4 tasks and 1 div for text description
    cy.get('div[id="tasks"]').children().should("have.length", 5);
  });

  it("redirects to training", () => {
    cy.intercept({ hostname: "server", pathname: "tasks" }, [
      defaultTasks.titanic.getTask(),
    ]);
    cy.visit("/#/list").contains("button", "participate");

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
