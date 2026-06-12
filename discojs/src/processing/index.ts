/** Dataset shapers, convenient to map with */

import { List } from "immutable";

import type {
  Dataset,
  DataFormat,
  DataType,
  Tabular,
  Task,
  Network,
} from "../index.js";

import * as processing from "./index.js";

export * from "./image.js";
export * from "./tabular.js";

export function preprocess<D extends DataType, N extends Network>(
  task: Task<D, N>,
  dataset: Dataset<DataFormat.Raw[D]>,
): Dataset<DataFormat.ModelEncoded[D]> {
  switch (task.dataType) {
    case "image": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.Raw["image"]>;
      const { IMAGE_H, IMAGE_W, LABEL_LIST } = task.trainingInformation;

      return d.map(([image, label]) => [
        processing.normalize(
          processing.removeAlpha(processing.resize(IMAGE_W, IMAGE_H, image)),
        ),
        processing.indexInList(label, LABEL_LIST),
      ]) as Dataset<DataFormat.ModelEncoded[D]>;
    }
    case "tabular": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.Raw["tabular"]>;
      const { inputColumns, outputColumn } = task.trainingInformation;

      return d.map((row) => {
        const output = processing.extractColumn(row, outputColumn);

        return [
          extractToNumbers(inputColumns, row),
          // TODO sanitization doesn't care about column distribution
          output !== "" ? processing.convertToNumber(output) : 0,
        ];
      }) as Dataset<DataFormat.ModelEncoded[D]>;
    }
    case "text": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.Raw["text"]>;

      const { contextLength, tokenizer } = task.trainingInformation;

      return d
        .map((text) => tokenizer.tokenize(text))
        .flatten()
        .batch(contextLength + 1, 1)
        .map((tokens) => [tokens.pop(), tokens.last()]) as Dataset<
        DataFormat.ModelEncoded[D]
      >;
    }
  }
}

export function preprocessWithoutLabel<D extends DataType>(
  task: Task<D, Network>,
  dataset: Dataset<DataFormat.RawWithoutLabel[D]>,
): Dataset<DataFormat.ModelEncoded[D][0]> {
  switch (task.dataType) {
    case "image": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.RawWithoutLabel["image"]>;
      const { IMAGE_H, IMAGE_W } = task.trainingInformation;

      return d.map((image) =>
        processing.normalize(
          processing.removeAlpha(processing.resize(IMAGE_W, IMAGE_H, image)),
        ),
      );
    }
    case "tabular": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.Raw["tabular"]>;
      const { inputColumns } = task.trainingInformation;

      return d.map((row) => extractToNumbers(inputColumns, row));
    }
    case "text": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.Raw["text"]>;

      const { contextLength, tokenizer } = task.trainingInformation;

      return d
        .map((text) => tokenizer.tokenize(text))
        .flatten()
        .batch(contextLength);
    }
  }
}

export function postprocess<D extends DataType>(
  task: Task<D, Network>,
  encoded: DataFormat.ModelEncoded[D][1],
): DataFormat.Inferred[D] {
  switch (task.dataType) {
    case "image": {
      // cast as typescript doesn't reduce generic type
      const index = encoded as DataFormat.ModelEncoded["image"][1];
      const labels = List(task.trainingInformation.LABEL_LIST);

      const v = labels.get(index);
      if (v === undefined) throw new Error("index not found in labels");
      return v as DataFormat.Inferred[D];
    }
    case "tabular": {
      // cast as typescript doesn't reduce generic type
      const v = encoded as DataFormat.ModelEncoded["tabular"][1];

      return v as DataFormat.Inferred[D];
    }
    case "text": {
      // cast as typescript doesn't reduce generic type
      const token = encoded as DataFormat.ModelEncoded["text"][1];

      return task.trainingInformation.tokenizer.decode([
        token,
      ]) as DataFormat.Inferred[D];
    }
  }
}

function extractToNumbers(columns: Iterable<string>, row: Tabular) {
  return (
    List(columns)
      .map((column) => processing.extractColumn(row, column))
      // TODO sanitization doesn't care about column distribution
      .map((v) => (v !== "" ? v : "0"))
      .map(processing.convertToNumber)
  );
}
