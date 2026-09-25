import { List } from "immutable";

import type { Task } from "#task/index";
import type { Dataset } from "#dataset/index";
import type { DataType, DataFormat, Network } from "#types/index";
import type { ModelMetadata } from "#models/model";

import { normalize, removeAlpha, resize } from "#processing/image";
import {
  indexInList,
  extractValue,
  convertToNumber,
  encodeTabularRow,
} from "#processing/tabular";

export function preprocess<D extends DataType, N extends Network>(
  task: Task<D, N>,
  dataset: Dataset<DataFormat.Raw[D]>,
  metadata?: ModelMetadata,
): Dataset<DataFormat.ModelEncoded[D]> {
  switch (task.dataType) {
    case "image": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.Raw["image"]>;
      const { IMAGE_H, IMAGE_W, LABEL_LIST } = task.trainingInformation;

      return d.map(([image, label]) => [
        normalize(removeAlpha(resize(IMAGE_W, IMAGE_H, image))),
        indexInList(label, LABEL_LIST),
      ]) as Dataset<DataFormat.ModelEncoded[D]>;
    }
    case "tabular": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.Raw["tabular"]>;
      const { inputColumns, outputColumn, categoricalColumns } =
        task.trainingInformation;
      const stats = metadata?.tabularStandardization;

      return d.map((row) => {
        const inputs = List(
          encodeTabularRow(row, inputColumns, categoricalColumns, stats),
        );

        return [inputs, convertToNumber(extractValue(row, outputColumn))];
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
        .filter((tokens) => tokens.size === contextLength + 1)
        .map((tokens) => [tokens.pop(), tokens.last()]) as Dataset<
        DataFormat.ModelEncoded[D]
      >;
    }
  }
}

export function preprocessWithoutLabel<D extends DataType>(
  task: Task<D, Network>,
  dataset: Dataset<DataFormat.RawWithoutLabel[D]>,
  metadata?: ModelMetadata,
): Dataset<DataFormat.ModelEncoded[D][0]> {
  switch (task.dataType) {
    case "image": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.RawWithoutLabel["image"]>;
      const { IMAGE_H, IMAGE_W } = task.trainingInformation;

      return d.map((image) =>
        normalize(removeAlpha(resize(IMAGE_W, IMAGE_H, image))),
      );
    }
    case "tabular": {
      // cast as typescript doesn't reduce generic type
      const d = dataset as Dataset<DataFormat.Raw["tabular"]>;
      const { inputColumns, categoricalColumns } = task.trainingInformation;
      const stats = metadata?.tabularStandardization;

      return d.map((row) =>
        List(encodeTabularRow(row, inputColumns, categoricalColumns, stats)),
      );
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
      const labels = List(task.trainingInformation.LABEL_LIST);

      const v = labels.get(encoded);
      if (v === undefined) throw new Error("index not found in labels");
      return v as DataFormat.Inferred[D];
    }
    case "tabular": {
      return encoded as DataFormat.Inferred[D];
    }
    case "text": {
      return task.trainingInformation.tokenizer.decode([
        encoded,
      ]) as DataFormat.Inferred[D];
    }
  }
}
