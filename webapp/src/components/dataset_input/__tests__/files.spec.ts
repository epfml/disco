import { expect, it } from "vitest";

import { dropped, matching } from "../files";

function file(name: string, type = ""): File {
  return new File([], name, { type });
}

function names(files: File[]): string[] {
  return files.map((f) => f.name);
}

it("keeps the files of the wanted type", () => {
  const files = [
    file("scan.png", "image/png"),
    file("notes.txt", "text/plain"),
    file("labels.csv", "text/csv"),
  ];

  expect(names(matching(files, "image"))).toEqual(["scan.png"]);
  expect(names(matching(files, "text"))).toEqual(["notes.txt"]);
  expect(names(matching(files, "tabular"))).toEqual(["labels.csv"]);
});

it("falls back to the extension when the type is unknown", () => {
  const files = [file("scan.JPEG"), file("scan.tiff"), file("notes.txt")];

  expect(names(matching(files, "image"))).toEqual(["scan.JPEG", "scan.tiff"]);
});

it("drops the hidden files a folder contains", () => {
  // macOS adds .DS_Store to every folder and ._ files when zipping
  const files = [
    file(".DS_Store"),
    file("._scan.png", "image/png"),
    file("scan.png", "image/png"),
  ];

  expect(names(matching(files, "image"))).toEqual(["scan.png"]);
});

it("drops the files without extension nor type", () => {
  expect(matching([file("README")], "image")).toHaveLength(0);
});

function fileEntry(name: string, type: string = ""): FileSystemFileEntry {
  return {
    isFile: true,
    isDirectory: false,
    name,
    file: (onSuccess: (file: File) => void) => onSuccess(file(name, type)),
  } as FileSystemFileEntry;
}

function directoryEntry(
  name: string,
  contained: FileSystemEntry[],
  batchSize: number = 100,
): FileSystemDirectoryEntry {
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
      // a reader hands out its entries by batch, then an empty one
      let read = 0;
      return {
        readEntries: (onSuccess: (entries: FileSystemEntry[]) => void) => {
          const batch = contained.slice(read, read + batchSize);
          read += batch.length;
          onSuccess(batch);
        },
      };
    },
  } as FileSystemDirectoryEntry;
}

function dataTransferOf(entries: FileSystemEntry[]): DataTransfer {
  return {
    items: entries.map((entry) => ({ webkitGetAsEntry: () => entry })),
    files: [],
  } as unknown as DataTransfer;
}

it("expands a dropped folder into the files it contains", async () => {
  const dataTransfer = dataTransferOf([
    directoryEntry("COVID+", [
      fileEntry("first.png", "image/png"),
      fileEntry("second.png", "image/png"),
    ]),
  ]);

  const { files, ignored } = await dropped(dataTransfer, "image");

  expect(names(files)).toEqual(["first.png", "second.png"]);
  expect(ignored).toBe(0);
});

it("expands the subfolders of a dropped folder", async () => {
  const dataTransfer = dataTransferOf([
    directoryEntry("dataset", [
      fileEntry("top.png", "image/png"),
      directoryEntry("nested", [fileEntry("deep.png", "image/png")]),
    ]),
  ]);

  const { files } = await dropped(dataTransfer, "image");

  expect(names(files)).toEqual(["top.png", "deep.png"]);
});

it("reads folders bigger than a reader batch", async () => {
  const contained = Array.from({ length: 250 }, (_, i) =>
    fileEntry(`image-${i}.png`, "image/png"),
  );

  const { files } = await dropped(
    dataTransferOf([directoryEntry("many", contained, 100)]),
    "image",
  );

  expect(files).toHaveLength(250);
});

it("only keeps the files of the wanted type inside a folder", async () => {
  const dataTransfer = dataTransferOf([
    directoryEntry("COVID+", [
      fileEntry("scan.png", "image/png"),
      fileEntry(".DS_Store"),
      fileEntry("notes.txt", "text/plain"),
    ]),
  ]);

  const { files, ignored } = await dropped(dataTransfer, "image");

  expect(names(files)).toEqual(["scan.png"]);
  expect(ignored).toBe(2);
});

it("only keeps the files of the wanted type dropped directly", async () => {
  // nothing filters what is dropped, unlike the file picker
  const dataTransfer = dataTransferOf([
    fileEntry("scan.png", "image/png"),
    fileEntry("data.xlsx", "application/vnd.ms-excel"),
  ]);

  const { files, ignored } = await dropped(dataTransfer, "image");

  expect(names(files)).toEqual(["scan.png"]);
  expect(ignored).toBe(1);
});

it("falls back to the dropped files without entries", async () => {
  const dataTransfer = {
    items: [{ webkitGetAsEntry: () => null }],
    files: [file("scan.png", "image/png"), file("data.xlsx")],
  } as unknown as DataTransfer;

  const { files, ignored } = await dropped(dataTransfer, "image");

  expect(names(files)).toEqual(["scan.png"]);
  expect(ignored).toBe(1);
});
