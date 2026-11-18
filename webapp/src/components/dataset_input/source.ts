import { Dataset, type DataFormat, type DataType } from "@epfml/discojs";
import { loadCSV, loadImage, loadText } from "@epfml/discojs-web";
import type { NamedLabeledImageDataset } from "./types";

// Files and labels can be cloned into a worker; Dataset methods cannot.
export type DatasetSource =
  | { type: "tabular"; file: File }
  | { type: "text"; file: File }
  | { type: "image"; files: { file: File; label: string }[] };

export function loadDataset(
  source: DatasetSource,
): Dataset<DataFormat.Raw[DataType]> {
  switch (source.type) {
    case "tabular":
      return loadCSV(source.file);
    case "text":
      return loadText(source.file);
    case "image":
      return loadNamedImageDataset(source).map(({ image, label }) => [
        image,
        label,
      ]);
  }
}

// Evaluation also displays the original filenames beside its predictions.
export function loadNamedImageDataset(
  source: Extract<DatasetSource, { type: "image" }>,
): NamedLabeledImageDataset {
  return new Dataset(source.files).map(async ({ file, label }) => ({
    filename: file.name,
    image: await loadImage(file),
    label,
  }));
}
