/** Dataset shapers, convenient to map with */

import { List } from "immutable";
import { AutoTokenizer } from "@xenova/transformers";

import type {
  Tabular,
  Task,
  TypedModelEncodedDataset,
  TypedRawDataset,
} from "../index.js";

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
          tabularToNumbers(inputColumns, row),
          tabularToNumbers(outputColumns, row),
        ]),
      ];
    }
    case "text": {
      const tokenizerName = task.trainingInformation.tokenizer;
      if (typeof tokenizerName !== "string")
        throw Error(
          "no tokenizer name specified in the task training information",
        );
      const tokenizer = await AutoTokenizer.from_pretrained(tokenizerName);
      const totalTokenCount =
        task.trainingInformation.maxSequenceLength ??
        (tokenizer.model_max_length as number);

      return [
        "text",
        dataset
          .map((line) =>
            processing.tokenizeAndLeftPad(line, tokenizer, totalTokenCount),
          )
          .map((tokens) => [tokens.pop(), tokens.shift()]),
      ];
    }
  }
}

function tabularToNumbers(
  columns: Iterable<string>,
  row: Tabular,
): List<number> {
  return (
    List(columns)
      .map((column) => processing.extractColumn(row, column))
      // TODO sanitization doesn't care about column distribution
      .map((v) => (v !== "" ? v : "0"))
      .map(processing.convertToNumber)
  );
}
