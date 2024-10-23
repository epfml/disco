import { basicTask, setupServerWith } from "../support/e2e";

// TODO move to components testing
// upstream doesn't yet allow that vuejs/test-utils#2468

describe("image dataset input by group", () => {
  it("shows passed labels", () => {
    setupServerWith(
      basicTask({
        dataType: "image",
        LABEL_LIST: ["first", "second", "third"],
        IMAGE_H: 100,
        IMAGE_W: 100,
      }),
    );

    cy.visit("/#/list");
    cy.get("button").contains("participate").click();

    cy.get("button").contains("next").click();

    cy.get("button").contains("group").click();

    cy.contains("Group label: first").should("exist");
    cy.contains("Group label: second").should("exist");
    cy.contains("Group label: third").should("exist");
  });

  it("allows to input images", () => {
    setupServerWith(
      basicTask({
        dataType: "image",
        LABEL_LIST: ["label"],
        IMAGE_H: 100,
        IMAGE_W: 100,
      }),
    );

    cy.visit("/#/list");
    cy.get("button").contains("participate").click();

    cy.get("button").contains("next").click();

    cy.get("button").contains("group").click();
    cy.contains("select images").selectFile([
      { fileName: "first.png", contents: new Uint8Array() },
      { fileName: "second.png", contents: new Uint8Array() },
      { fileName: "third.png", contents: new Uint8Array() },
    ]);

    cy.contains("Number of selected files: 3").should("exist");
  });
});

describe("image dataset input by csv", () => {
  it("allows to input CSV then images", () => {
    setupServerWith(
      basicTask({
        dataType: "image",
        LABEL_LIST: ["label"],
        IMAGE_H: 100,
        IMAGE_W: 100,
      }),
    );

    cy.visit("/#/list");
    cy.get("button").contains("participate").click();

    cy.get("button").contains("next").click();

    cy.get("button").contains("csv").click();
    cy.contains("select CSV").selectFile({
      fileName: "csv",
      contents: new TextEncoder().encode(
        "filename,label\n" +
          "first,first\n" +
          "second,second\n" +
          "third,third\n",
      ),
    });

    cy.contains("select images").selectFile([
      { fileName: "first.png", contents: new Uint8Array() },
      { fileName: "second.png", contents: new Uint8Array() },
      { fileName: "third.png", contents: new Uint8Array() },
    ]);

    cy.contains("Number of selected files: 3").should("exist");
  });
});

describe("tabular dataset input", () => {
  it("allows to input CSV", () => {
    setupServerWith(
      basicTask({
        dataType: "tabular",
        inputColumns: ["a", "b"],
        outputColumn: "c",
      }),
    );

    cy.visit("/#/list");
    cy.get("button").contains("participate").click();

    cy.get("button").contains("next").click();

    cy.contains("select CSV").selectFile({
      fileName: "filename",
      contents: new TextEncoder().encode("a,b,c\n1,2,3\n"),
    });

    cy.contains("filename").should("exist");
  });
});
