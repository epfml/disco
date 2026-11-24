import { defaultTasks, serializeTaskToJSON } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e.ts";

const token = "the-task-token";

/**
 * Serve titanic publicly, and a copy of it as a private task
 * that the server only gives with its token
 */
function setupServerWithPrivateTask(): void {
  setupServerWith(defaultTasks.titanic);

  const titanic = defaultTasks.titanic.getTask();
  cy.wrap<typeof titanic, Awaited<typeof titanic>>(titanic).then((titanic) =>
    cy
      .intercept(
        { hostname: "server", pathname: "/tasks/private-task" },
        (req) => {
          // like the server, answer as for an unknown task without the token
          if (req.headers.authorization === `Bearer ${token}`)
            req.reply({
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                serializeTaskToJSON({
                  ...titanic,
                  id: "private-task",
                  displayInformation: {
                    ...titanic.displayInformation,
                    title: "Private titanic",
                  },
                }),
              ),
            });
          else req.reply({ statusCode: 404 });
        },
      )
      .as("privateTask"),
  );
}

describe("private link", () => {
  it("opens its private task", () => {
    setupServerWithPrivateTask();

    cy.visit(`/private-task#token=${token}`);

    cy.wait("@privateTask");
    cy.url().should(
      "eq",
      `${Cypress.config().baseUrl}private-task#token=${token}`,
    );
    cy.contains("Private titanic");
  });

  it("shows its private task next to the public ones", () => {
    setupServerWithPrivateTask();

    cy.visit(`/private-task#token=${token}`);
    cy.contains("Private titanic");

    cy.get('aside a[href="/list"]').click();
    cy.get('div[id="tasks"]').children().should("have.length", 2);
    cy.get('div[id="private-task"]');
  });

  it("leads to the not-found page with a wrong token", () => {
    setupServerWithPrivateTask();

    cy.visit("/private-task#token=wrong-token");

    cy.contains("This private link is invalid");
    cy.url().should("eq", `${Cypress.config().baseUrl}not-found`);
  });
});
