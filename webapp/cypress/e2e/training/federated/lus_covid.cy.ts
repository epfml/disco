import { assertNoErrorToast } from "../../../support/training";

function selectLusCovidDataset(): void {
  for (const [directory, label] of [
    ["COVID+", "COVID-Positive"],
    ["COVID-", "COVID-Negative"],
  ]) {
    cy.task<string[]>("readdir", `../datasets/lus_covid/${directory}/`).then(
      (files) => {
        // The browser and Node peer use disjoint halves of the full dataset.
        // The browser keeps images with even indexes
        const imageFiles = files
          .filter((p) => /\.(png|jpe?g)$/i.test(p))
          .sort()
          .filter((_, index) => index % 2 === 0);
        if (imageFiles.length === 0)
          throw new Error(`No images in ${directory}`);
        cy.contains("h4", label)
          .parents()
          .eq(1)
          .find('[data-testid="select-image-button"]')
          .selectFile(imageFiles);
      },
    );
  }
}

it("trains LUS COVID with a Node participant through a real server", () => {
  cy.visit("/");
  cy.contains("a", "Start training").click();
  cy.get(".driver-popover-close-btn").click();
  cy.get("#lus_covid").contains("button", "participate").click();
  cy.contains("button", "next").click();
  selectLusCovidDataset();
  cy.contains("button", "next").click();
  cy.contains("button", "collaboratively").click();
  cy.contains("button", "Start training").click();
  assertNoErrorToast();

  cy.contains("h6", "number of participants")
    .next({ timeout: 300_000 })
    .should("have.text", "2");
  cy.contains("Training successfully completed", { timeout: 300_000 });
  assertNoErrorToast();
  cy.contains("h6", "epochs").next().should("have.text", "4 / 4");
  cy.contains("h6", "Collaborative model sharing")
    .next()
    .should("have.text", "1");
});
