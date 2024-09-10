/** Dataset shapers, convenient to map with */

import { List, Map } from "immutable";

import type {
  Tabular,
  Task,
  TypedInferredDataset,
  TypedModelEncodedDataset,
  TypedModelEncodedOnlyWithLabelDataset,
  TypedModelEncodedWithoutLabelDataset,
  TypedRawDataset,
  TypedRawWithoutLabelDataset,
} from "../index.js";
import { models } from "../index.js";

import * as processing from "./index.js";

export * from "./image.js";
export * from "./tabular.js";
export * from "./text.js";

export async function preprocess(
  task: Task,
  [t, dataset]: TypedRawDataset,
): Promise<TypedModelEncodedDataset> {
  switch (t) {
    case "image": {
      const { LABEL_LIST, IMAGE_H, IMAGE_W } = task.trainingInformation;
      if (
        IMAGE_H === undefined ||
        IMAGE_W === undefined ||
        LABEL_LIST === undefined
      )
        throw new Error("task is missing fields for image dataset");

      return [
        "image",
        dataset.map(([image, label]) => [
          processing.normalize(
            processing.removeAlpha(processing.resize(IMAGE_W, IMAGE_H, image)),
          ),
          processing.indexInList(label, LABEL_LIST),
        ]),
      ];
    }
    case "tabular": {
      const { inputColumns, outputColumns } = task.trainingInformation;
      if (inputColumns === undefined || outputColumns === undefined)
        throw new Error("tabular task without input and output columns");

      return [
        "tabular",
        dataset.map((row) => [
          extractToNumbers(inputColumns, row),
          extractToNumbers(outputColumns, row),
        ]),
      ];
    }
    case "text": {
      const tokenizer = await models.getTaskTokenizer(task);
      const totalTokenCount =
        task.trainingInformation.maxSequenceLength ??
        (tokenizer.model_max_length as number);

      return [
        "text",
        dataset
          .map((line) =>
            processing.tokenizeAndLeftPad(line, tokenizer, totalTokenCount),
          )
          .map((tokens) => [tokens.pop(), tokens.last()]),
      ];
    }
  }
}

export async function preprocessWithoutLabel(
  task: Task,
  [t, dataset]: TypedRawWithoutLabelDataset,
): Promise<TypedModelEncodedWithoutLabelDataset> {
  switch (t) {
    case "image": {
      const { IMAGE_H, IMAGE_W } = task.trainingInformation;
      if (IMAGE_H === undefined || IMAGE_W === undefined)
        throw new Error("task is missing fields for image dataset");

      return [
        "image",
        dataset.map((image) =>
          processing.normalize(
            processing.removeAlpha(processing.resize(IMAGE_W, IMAGE_H, image)),
          ),
        ),
      ];
    }
    case "tabular": {
      const { inputColumns } = task.trainingInformation;
      if (inputColumns === undefined)
        throw new Error("tabular task without input columns");

      return [
        "tabular",
        dataset.map((row) => extractToNumbers(inputColumns, row)),
      ];
    }
    case "text": {
      const tokenizer = await models.getTaskTokenizer(task);
      const totalTokenCount =
        task.trainingInformation.maxSequenceLength ??
        (tokenizer.model_max_length as number);

      return [
        "text",
        dataset
          .map((line) =>
            processing.tokenizeAndLeftPad(line, tokenizer, totalTokenCount),
          )
          .map((tokens) => tokens.pop()),
      ];
    }
  }
}

export async function postprocess(
  task: Task,
  [t, dataset]: TypedModelEncodedOnlyWithLabelDataset,
): Promise<TypedInferredDataset> {
  switch (t) {
    case "image": {
      const { LABEL_LIST } = task.trainingInformation;
      if (LABEL_LIST === undefined)
        throw new Error("task is missing fields for image dataset");
      const labels = List(LABEL_LIST);

      return [
        "image",
        dataset.map((index) => {
          const v = labels.get(index);
          if (v === undefined) throw new Error("index not found in labels");
          return v;
        }),
      ];
    }
    case "tabular": {
      const { outputColumns } = task.trainingInformation;
      if (outputColumns === undefined)
        throw new Error("tabular task without input columns");
      const output = List(outputColumns);

      return ["tabular", dataset.map((row) => Map(output.zip(row)).toObject())];
    }
    case "text": {
      const tokenizer = await models.getTaskTokenizer(task);

      return ["text", dataset.map((token) => tokenizer.decode([token]))];
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
