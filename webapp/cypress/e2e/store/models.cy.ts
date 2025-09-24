import { defaultTasks } from "@epfml/discojs";
import { setupServerWith } from "../../support/e2e";

beforeEach(() =>
	cy.wrap(async () => {
		const root = await navigator.storage.getDirectory();
		try {
			await root.removeEntry("models", { recursive: true });
		} catch (e) {
			if (e instanceof DOMException && e.name === "NotFoundError") return;
			throw e;
		}
	}),
);

it("stores models",
  { retries: 5 }, // can exhaust memory
  () => {
  setupServerWith(defaultTasks.titanic);

  cy.visit("/#/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "test").should("exist");

  cy.reload();
  cy.contains("button", "test").should("exist");
});

it("stores larger models",
  { retries: 5 }, // can exhaust memory
  () => {
  setupServerWith(defaultTasks.wikitext);

  cy.visit("/#/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "test")
    .should("exist")
    .then(
      () =>
        // storage takes time and no user feedback
        new Promise((resolve) => setTimeout(resolve, 300)),
    );

  cy.reload();
  cy.contains("button", "test").should("exist");
});
