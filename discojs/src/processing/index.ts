/** Dataset shapers, convenient to map with */

import { List } from "immutable";

import type {
  Dataset,
  DataType,
  Inferred,
  ModelEncoded,
  Raw,
  RawWithoutLabel,
  Tabular,
  Task,
  TrainingInformation,
} from "../index.js";
import { models } from "../index.js";

import * as processing from "./index.js";

export * from "./image.js";
export * from "./tabular.js";
export * from "./text.js";

export async function preprocess<D extends DataType>(
  task: Task<D>,
  dataset: Dataset<Raw[D]>,
): Promise<Dataset<ModelEncoded[D]>> {
  switch (task.trainingInformation.dataType) {
    case "image": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<Raw["image"]>;
      const { IMAGE_H, IMAGE_W, LABEL_LIST } =
        task.trainingInformation as TrainingInformation<"image">;

      return d.map(([image, label]) => [
        processing.normalize(
          processing.removeAlpha(processing.resize(IMAGE_W, IMAGE_H, image)),
        ),
        processing.indexInList(label, LABEL_LIST),
      ]) as Dataset<ModelEncoded[D]>;
    }
    case "tabular": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<Raw["tabular"]>;
      const { inputColumns, outputColumn } =
        task.trainingInformation as TrainingInformation<"tabular">;

      return d.map((row) => {
        const output = processing.extractColumn(row, outputColumn);

        return [
          extractToNumbers(inputColumns, row),
          // TODO sanitization doesn't care about column distribution
          output !== "" ? processing.convertToNumber(output) : 0,
        ];
      }) as Dataset<ModelEncoded[D]>;
    }
    case "text": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<Raw["text"]>;
      const t = task as Task<"text">;

      const tokenizer = await models.getTaskTokenizer(t);
      const totalTokenCount =
        task.trainingInformation.maxSequenceLength ??
        (tokenizer.model_max_length as number);

      return d
        .map((line) =>
          processing.tokenizeAndLeftPad(line, tokenizer, totalTokenCount),
        )
        .map((tokens) => [tokens.pop(), tokens.last()]) as Dataset<
        ModelEncoded[D]
      >;
    }
  }
}

export async function preprocessWithoutLabel<D extends DataType>(
  task: Task<D>,
  dataset: Dataset<RawWithoutLabel[D]>,
): Promise<Dataset<ModelEncoded[D][0]>> {
  switch (task.trainingInformation.dataType) {
    case "image": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<RawWithoutLabel["image"]>;
      const { IMAGE_H, IMAGE_W } =
        task.trainingInformation as TrainingInformation<"image">;

      return d.map((image) =>
        processing.normalize(
          processing.removeAlpha(processing.resize(IMAGE_W, IMAGE_H, image)),
        ),
      );
    }
    case "tabular": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<Raw["tabular"]>;
      const { inputColumns } =
        task.trainingInformation as TrainingInformation<"tabular">;

      return d.map((row) => extractToNumbers(inputColumns, row));
    }
    case "text": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<Raw["text"]>;
      const t = task as Task<"text">;

      const tokenizer = await models.getTaskTokenizer(t);
      const totalTokenCount =
        t.trainingInformation.maxSequenceLength ??
        (tokenizer.model_max_length as number);

      return d
        .map((line) =>
          processing.tokenizeAndLeftPad(line, tokenizer, totalTokenCount),
        )
        .map((tokens) => tokens.pop());
    }
  }
}

export async function postprocess<D extends DataType>(
  task: Task<D>,
  dataset: Dataset<ModelEncoded[D][1]>,
): Promise<Dataset<Inferred[D]>> {
  switch (task.trainingInformation.dataType) {
    case "image": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<ModelEncoded["image"][1]>;
      const { LABEL_LIST } =
        task.trainingInformation as TrainingInformation<"image">;
      const labels = List(LABEL_LIST);

      return d.map((index) => {
        const v = labels.get(index);
        if (v === undefined) throw new Error("index not found in labels");
        return v;
      }) as Dataset<Inferred[D]>;
    }
    case "tabular": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<ModelEncoded["tabular"][1]>;
      const { outputColumn } =
        task.trainingInformation as TrainingInformation<"tabular">;

      return d.map((row) =>
        Object.fromEntries([[outputColumn, row]]),
      ) as Dataset<Inferred[D]>;
    }
    case "text": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<ModelEncoded["text"][1]>;
      const t = task as Task<"text">;
      const tokenizer = await models.getTaskTokenizer(t);

      return d.map((token) => tokenizer.decode([token])) as Dataset<
        Inferred[D]
      >;
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
