/** Dataset shapers, convenient to map with */

import { List } from "immutable";

import type {
  Dataset,
  DataFormat,
  DataType,
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
  dataset: Dataset<DataFormat.Raw[D]>,
): Promise<Dataset<DataFormat.ModelEncoded[D]>> {
  switch (task.trainingInformation.dataType) {
    case "image": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.Raw["image"]>;
      const { IMAGE_H, IMAGE_W, LABEL_LIST } =
        task.trainingInformation as TrainingInformation<"image">;

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
      const { inputColumns, outputColumn } =
        task.trainingInformation as TrainingInformation<"tabular">;

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
      const t = task as Task<"text">;
      const contextLength = task.trainingInformation.contextLength

      const tokenizer = await models.getTaskTokenizer(t);
      return d.map(text => processing.tokenize(tokenizer, text))
        .flatten()
        .batch(contextLength + 1, 1)
        .map((tokens) => [tokens.pop(), tokens.last()]) as
          Dataset<DataFormat.ModelEncoded[D]>;
    }
  }
}

export async function preprocessWithoutLabel<D extends DataType>(
  task: Task<D>,
  dataset: Dataset<DataFormat.RawWithoutLabel[D]>,
): Promise<Dataset<DataFormat.ModelEncoded[D][0]>> {
  switch (task.trainingInformation.dataType) {
    case "image": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.RawWithoutLabel["image"]>;
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
      const d = dataset as Dataset<DataFormat.Raw["tabular"]>;
      const { inputColumns } =
        task.trainingInformation as TrainingInformation<"tabular">;

      return d.map((row) => extractToNumbers(inputColumns, row));
    }
    case "text": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.Raw["text"]>;
      const t = task as Task<"text">;
      const contextLength = task.trainingInformation.contextLength
      const tokenizer = await models.getTaskTokenizer(t);

      return d.map(text => processing.tokenize(tokenizer, text))
        .flatten()
        .batch(contextLength)
    }
  }
}

export async function postprocess<D extends DataType>(
	task: Task<D>,
	encoded: DataFormat.ModelEncoded[D][1],
): Promise<DataFormat.Inferred[D]> {
	switch (task.trainingInformation.dataType) {
		case "image": {
			// cast as typescript doesn't reduce generic type
			const index = encoded as DataFormat.ModelEncoded["image"][1];
			const { LABEL_LIST } =
				task.trainingInformation as TrainingInformation<"image">;
			const labels = List(LABEL_LIST);

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
			const t = task as Task<"text">;
			const tokenizer = await models.getTaskTokenizer(t);

			return tokenizer.decode([token]) as DataFormat.Inferred[D];
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
