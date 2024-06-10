// TODO rm when fully generic

import { List } from "immutable";
import * as tf from "@tensorflow/tfjs";

import type {
  Image,
  Tabular,
  Task,
  TypedDataset,
  TypedLabeledDataset,
} from "../../index.js";
import { convertors } from "../../index.js";

import { Data, ImageData, TabularData, TextData } from "./index.js";
import { DataSplit } from "./data_split.js";

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}

async function intoTFDataset<T extends tf.TensorContainer>(
  iter: AsyncIterable<T>,
): Promise<tf.data.Dataset<T>> {
  // tf doesn't like having changing tensors
  const materialized = await arrayFromAsync(iter);
  return tf.data.array(materialized);
}

function imageToTensor(image: Image<3>): tf.Tensor3D {
  return tf.tensor3d(image.data, [image.width, image.height, 3], "int32");
}

function tabularToNumbers(columns: Iterable<string>, row: Tabular): number[] {
  return List(columns)
    .map((column) => convertors.extractColumn(row, column))
    .map((v) => (v !== "" ? v : "0")) // TODO how to specify defaults?
    .map(convertors.convertToNumber)
    .toArray();
}

export async function datasetToData(
  task: Task,
  [t, dataset]: TypedDataset,
): Promise<Data> {
  switch (t) {
    case "image": {
      const converted = dataset
        .map(convertors.removeAlpha)
        .map((image) => convertors.expandToMulticolor(image))
        .map((image) => ({
          xs: imageToTensor(image),
        }));
      return await ImageData.init(await intoTFDataset(converted), task);
    }
    case "tabular": {
      const inputColumns = task.trainingInformation.inputColumns;
      if (inputColumns === undefined)
        throw new Error("tabular task without input columns");
      const converted = dataset.map((row) => ({
        xs: tabularToNumbers(inputColumns, row),
      }));
      return await TabularData.init(await intoTFDataset(converted), task);
    }
    case "text":
      return await TextData.init(await intoTFDataset(dataset), task);
  }
}

export async function labeledDatasetToData(
  task: Task,
  [t, dataset]: TypedLabeledDataset,
): Promise<Data> {
  const labels = List(task.trainingInformation.LABEL_LIST);

  switch (t) {
    case "image": {
      const converted = dataset
        .map(
          ([image, label]) =>
            [
              convertors.expandToMulticolor(convertors.removeAlpha(image)),
              convertors.indexInList(label, labels),
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
      return await ImageData.init(await intoTFDataset(converted), task);
    }
    case "tabular": {
      const { inputColumns, outputColumns } = task.trainingInformation;
      if (inputColumns === undefined || outputColumns === undefined)
        throw new Error("tabular task without input and output columns");
      const converted = dataset.map(
        (row) =>
          ({
            xs: tabularToNumbers(inputColumns, row),
            ys: tf.tensor1d(tabularToNumbers(outputColumns, row)),
          }) satisfies {
            xs: number[];
            ys: tf.Tensor1D;
          },
      );
      return await TabularData.init(await intoTFDataset(converted), task);
    }
    case "text":
      return await TextData.init(await intoTFDataset(dataset), task);
  }
}

export async function labeledDatasetToDataSplit(
  task: Task,
  [t, dataset]: TypedLabeledDataset,
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
