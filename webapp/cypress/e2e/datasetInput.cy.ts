import { basicTask, setupServerWith } from "../support/e2e";

// TODO move to components testing
// upstream doesn't yet allow that vuejs/test-utils#2468

function droppedFolder(name: string, filenames: string[]): unknown {
  const fileEntry = (filename: string) => ({
    isFile: true,
    isDirectory: false,
    name: filename,
    file: (onSuccess: (file: File) => void) =>
      onSuccess(
        new File([], filename, {
          type: filename.endsWith(".png") ? "image/png" : "",
        }),
      ),
  });

  let read = false;
  const directoryEntry = {
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => ({
      readEntries: (onSuccess: (entries: unknown[]) => void) => {
        onSuccess(read ? [] : filenames.map(fileEntry));
        read = true;
      },
    }),
  };

  return {
    items: [{ webkitGetAsEntry: () => directoryEntry }],
    files: [],
    dropEffect: "none",
  };
}

function droppedFile(name: string, type: string): unknown {
  const fileEntry = {
    isFile: true,
    isDirectory: false,
    name,
    file: (onSuccess: (file: File) => void) =>
      onSuccess(new File([], name, { type })),
  };

  return {
    items: [{ webkitGetAsEntry: () => fileEntry }],
    files: [],
    dropEffect: "none",
  };
}

function goToDatasetInputStep() {
  cy.visit("/list");
  cy.get(".driver-popover-close-btn").click();
  cy.get("button").contains("participate").click();
  cy.get("button").contains("next").click();
}

describe("image dataset input by group", () => {
  it("shows passed labels", () => {
    setupServerWith(
      basicTask("image", {
        LABEL_LIST: ["first", "second", "third"],
        IMAGE_H: 100,
        IMAGE_W: 100,
      }),
    );

    goToDatasetInputStep();
    cy.get("button").contains("group").click();

    cy.contains("Group label: first").should("exist");
    cy.contains("Group label: second").should("exist");
    cy.contains("Group label: third").should("exist");
  });

  it("allows to input images", () => {
    setupServerWith(
      basicTask("image", {
        LABEL_LIST: ["label"],
        IMAGE_H: 100,
        IMAGE_W: 100,
      }),
    );

    goToDatasetInputStep();
    cy.get("button").contains("group").click();
    cy.contains("Drop images");
    cy.get('[data-testid="select-image-button"]')
      .first()
      .selectFile([
        { fileName: "first.png", contents: new Uint8Array() },
        { fileName: "second.png", contents: new Uint8Array() },
        { fileName: "third.png", contents: new Uint8Array() },
      ]);

    cy.contains("Number of selected files: 3").should("exist");
  });

  it("allows to drop a folder of images", () => {
    setupServerWith(
      basicTask("image", {
        LABEL_LIST: ["label"],
        IMAGE_H: 100,
        IMAGE_W: 100,
      }),
    );

    goToDatasetInputStep();
    cy.get("button").contains("group").click();
    cy.contains("Drop images or a folder here");

    cy.get('[data-testid="drop-image-area"]')
      .first()
      .trigger("drop", {
        dataTransfer: droppedFolder("COVID+", [
          "first.png",
          "second.png",
          ".DS_Store",
        ]),
      });

    cy.contains("Number of selected files: 2").should("exist");
    cy.contains("Ignored 1 file(s) that aren't images").should("exist");
  });

  it("rejects a dropped file that isn't an image", () => {
    setupServerWith(
      basicTask("image", {
        LABEL_LIST: ["label"],
        IMAGE_H: 100,
        IMAGE_W: 100,
      }),
    );

    goToDatasetInputStep();
    cy.get("button").contains("group").click();

    cy.get('[data-testid="drop-image-area"]')
      .first()
      .trigger("drop", {
        dataTransfer: droppedFile("data.xlsx", "application/vnd.ms-excel"),
      });

    cy.contains("Didn't find any images in what you dropped").should("exist");
    cy.contains("Number of selected files").should("not.exist");
  });
});

describe("image dataset input by csv", () => {
  it("allows to input CSV then images", () => {
    setupServerWith(
      basicTask("image", {
        LABEL_LIST: ["label"],
        IMAGE_H: 100,
        IMAGE_W: 100,
      }),
    );

    goToDatasetInputStep();
    cy.get("button").contains("csv").click();
    cy.contains("Drop CSV");
    cy.get('[data-testid="select-tabular-button"]')
      .first()
      .selectFile({
        fileName: "csv",
        contents: new TextEncoder().encode(
          "filename,label\n" +
            "first,first\n" +
            "second,second\n" +
            "third,third\n",
        ),
      });

    cy.contains("Drop images");
    cy.get('[data-testid="select-image-button"]')
      .first()
      .selectFile([
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
      basicTask("tabular", {
        inputColumns: ["a", "b"],
        outputColumn: "c",
      }),
    );

    goToDatasetInputStep();
    cy.contains("Drop CSV");
    cy.get('[data-testid="select-tabular-button"]')
      .first()
      .selectFile({
        fileName: "filename",
        contents: new TextEncoder().encode("a,b,c\n1,2,3\n"),
      });

    cy.contains("filename").should("exist");
  });
});
