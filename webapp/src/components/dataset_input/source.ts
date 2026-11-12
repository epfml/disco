import { Dataset, type DataFormat, type DataType } from "@epfml/discojs";
import { loadCSV, loadImage, loadText } from "@epfml/discojs-web";

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
      return new Dataset(source.files).map(
        async ({ file, label }) =>
          [await loadImage(file), label] as DataFormat.Raw["image"],
      );
  }
}
