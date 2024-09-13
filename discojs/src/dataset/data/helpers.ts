/** Internal functions to help with Dataset to Data/DataSplit conversion
 *
 * @todo rm when fully using Dataset
 */

import { List } from "immutable";
import * as tf from "@tensorflow/tfjs";

import type {
  Image,
  Tabular,
  Task,
  TypedRawDataset,
  TypedRawWithoutLabelDataset,
} from "../../index.js";
import { processing } from "../../index.js";

import { Data, ImageData, TabularData, TextData } from "./index.js";
import { DataSplit } from "./data_split.js";

function intoTFDataset<T extends tf.TensorContainer>(
  iter: AsyncIterable<T>,
): tf.data.Dataset<T> {
  // @ts-expect-error generator
  return tf.data.generator(async function* () {
    yield* iter;
  });
}

function imageToTensor(image: Image<3>): tf.Tensor3D {
  return tf.tensor3d(image.data, [image.width, image.height, 3], "int32");
}

function tabularToNumbers(columns: Iterable<string>, row: Tabular): number[] {
  return List(columns)
    .map((column) => processing.extractColumn(row, column))
    .map((v) => (v !== "" ? v : "0")) // TODO how to specify defaults?
    .map(processing.convertToNumber)
    .toArray();
}

export async function datasetToData(
  task: Task,
  [t, dataset]: TypedRawWithoutLabelDataset,
): Promise<Data> {
  switch (t) {
    case "image": {
      const converted = dataset
        .map(processing.removeAlpha)
        .map((image) => processing.expandToMulticolor(image))
        .map((image) => ({
          xs: imageToTensor(image),
        }));
      return await ImageData.init(intoTFDataset(converted), task);
    }
    case "tabular": {
      const inputColumns = task.trainingInformation.inputColumns;
      if (inputColumns === undefined)
        throw new Error("tabular task without input columns");
      const converted = dataset.map((row) => ({
        xs: tabularToNumbers(inputColumns, row),
      }));
      return await TabularData.init(intoTFDataset(converted), task);
    }
    case "text":
      return await TextData.init(intoTFDataset(dataset), task);
  }
}

export async function labeledDatasetToData(
  task: Task,
  [t, dataset]: TypedRawDataset,
): Promise<Data> {
  switch (t) {
    case "image": {
      const labels = List(task.trainingInformation.LABEL_LIST);
      const converted = dataset
        .map(
          ([image, label]) =>
            [
              processing.expandToMulticolor(processing.removeAlpha(image)),
              processing.indexInList(label, labels),
            ] as const,
        )
        .map(
          ([image, label]) =>
            ({
              xs: imageToTensor(image),
              ys: tf.oneHot(label, labels.size, 1, 0, "int32") as tf.Tensor1D,
            }) satisfies {
              xs: tf.Tensor3D;
              ys: tf.Tensor1D;
            },
        );
      return await ImageData.init(intoTFDataset(converted), task);
    }
    case "tabular": {
      const { inputColumns, outputColumn } = task.trainingInformation;
      if (inputColumns === undefined || outputColumn === undefined)
        throw new Error("tabular task without input and output columns");
      const converted = dataset.map(
        (row) =>
          ({
            xs: tabularToNumbers(inputColumns, row),
            ys: tf.tensor1d(tabularToNumbers([outputColumn], row)),
          }) satisfies {
            xs: number[];
            ys: tf.Tensor1D;
          },
      );
      return await TabularData.init(intoTFDataset(converted), task);
    }
    case "text":
      return await TextData.init(intoTFDataset(dataset), task);
  }
}

export async function labeledDatasetToDataSplit(
  task: Task,
  [t, dataset]: TypedRawDataset,
): Promise<DataSplit> {
  const split = task.trainingInformation.validationSplit;

  let train: Data;
  let validation: Data;
  switch (t) {
    case "image": {
      [train, validation] = await Promise.all(
        dataset.split(split).map((d) => labeledDatasetToData(task, [t, d])),
      );
      break;
    }
    case "tabular": {
      [train, validation] = await Promise.all(
        dataset.split(split).map((d) => labeledDatasetToData(task, [t, d])),
      );
      break;
    }
    case "text": {
      [train, validation] = await Promise.all(
        dataset.split(split).map((d) => labeledDatasetToData(task, [t, d])),
      );
      break;
    }
  }

  return { train, validation };
}
