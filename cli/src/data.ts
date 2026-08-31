import path from "node:path";
import { createReadStream } from "node:fs";
import { Dataset, processing } from "@epfml/discojs";
import { DataFormat, DataType, Image, Task, Text } from "@epfml/discojs";
import { loadCSV, loadImage, loadImagesInDir } from "@epfml/discojs-node";
import { Repeat } from "immutable";

function loadTextSamples(
  filePath: string,
  userIdx?: number,
  totalClient?: number,
): Dataset<Text> {
  return new Dataset(async function* () {
    const stream = createReadStream(filePath, { encoding: "utf8" });
    const sampleDelimiter = "<|endoftext|>";
    let buffer = "";
    let sampleIndex = 0;

    for await (const chunk of stream) {
      if (typeof chunk !== "string") {
        throw new Error("Expected file stream to yield string");
      }

      buffer += chunk;

      let delimiterIndex = buffer.indexOf(sampleDelimiter);
      while (delimiterIndex !== -1) {
        const sample = buffer
          .slice(0, delimiterIndex + sampleDelimiter.length)
          .trim();
        const shouldYield =
          userIdx === undefined ||
          totalClient === undefined ||
          sampleIndex % totalClient === userIdx;

        if (sample !== "" && shouldYield) {
          yield sample;
        }

        sampleIndex++;
        buffer = buffer.slice(delimiterIndex + sampleDelimiter.length);
        delimiterIndex = buffer.indexOf(sampleDelimiter);
      }
    }

    const trailingSample = buffer.trim();
    const shouldYieldTrailing =
      userIdx === undefined ||
      totalClient === undefined ||
      sampleIndex % totalClient === userIdx;

    if (trailingSample !== "" && shouldYieldTrailing) {
      yield trailingSample;
    }
  });
}

async function loadSimpleFaceData(
  userIdx: number,
  totalClient: number,
): Promise<Dataset<DataFormat.Raw["image"]>> {
  const folder = path.join("..", "datasets", "simple_face");

  const [adults, childs]: Dataset<[Image, string]>[] = [
    (await loadImagesInDir(path.join(folder, "adult"))).zip(Repeat("adult")),
    (await loadImagesInDir(path.join(folder, "child"))).zip(Repeat("child")),
  ];

  const combinded = adults.chain(childs);

  const sharded = combinded.filter((_, i) => i % totalClient === userIdx);

  return sharded;
}

async function loadLusCovidData(
  userIdx: number,
  totalClient: number,
): Promise<Dataset<DataFormat.Raw["image"]>> {
  const folder = path.join("..", "datasets", "lus_covid");

  const [positive, negative]: Dataset<[Image, string]>[] = [
    (await loadImagesInDir(path.join(folder, "COVID+"))).zip(
      Repeat("COVID-Positive"),
    ),
    (await loadImagesInDir(path.join(folder, "COVID-"))).zip(
      Repeat("COVID-Negative"),
    ),
  ];

  const combined: Dataset<[Image, string]> = positive.chain(negative);

  const sharded = combined.filter((_, i) => i % totalClient === userIdx);

  return sharded;
}

function loadTinderDogData(split: number): Dataset<DataFormat.Raw["image"]> {
  const folder = path.join("..", "datasets", "tinder_dog", `${split + 1}`);
  return loadCSV(path.join(folder, "labels.csv"))
    .map(
      (row) =>
        [
          processing.extractColumn(row, "filename"),
          processing.extractColumn(row, "label"),
        ] as const,
    )
    .map(async ([filename, label]) => {
      try {
        const image = await Promise.any(
          ["png", "jpg", "jpeg"].map((ext) =>
            loadImage(path.join(folder, `${filename}.${ext}`)),
          ),
        );
        return [image, label];
      } catch {
        throw Error(`${filename} not found in ${folder}`);
      }
    });
}

function loadData(
  dataName: string,
  split: number,
): Dataset<DataFormat.Raw["image"]> {
  const folder = path.join("..", "datasets", `${dataName}`, `client_${split}`);
  return loadCSV(path.join(folder, "labels.csv"))
    .map(
      (row) =>
        [
          processing.extractColumn(row, "filename"),
          processing.extractColumn(row, "label"),
        ] as const,
    )
    .map(async ([filename, label]) => {
      try {
        const img = await Promise.any(
          ["png", "jpg", "jpeg"].map((ext) =>
            loadImage(path.join(folder, `${filename}.${ext}`)),
          ),
        );
        return [img, label];
      } catch {
        throw Error(`${filename} not found in ${folder}`);
      }
    });
}

export async function getTaskData<D extends DataType>(
  taskID: Task.ID,
  userIdx: number,
  totalClient: number,
  datasetPath?: string,
  isValidation?: boolean,
  validationDatasetPath?: string,
): Promise<Dataset<DataFormat.Raw[D]>> {
  if (validationDatasetPath && taskID !== "goldfish" && taskID !== "centralized-gpt2-finetune")
    throw new Error("validationDatasetPath is currently only supported for text tasks")

  switch (taskID) {
    case "simple_face": // remove
      return (await loadSimpleFaceData(userIdx, totalClient)) as Dataset<
        DataFormat.Raw[D]
      >;
    case "titanic":
    case "titanic_decentralized":
      const titanicData = loadCSV(
        path.join("..", "datasets", "titanic_train.csv"),
      ) as Dataset<DataFormat.Raw[D]>;
      return titanicData.filter((_, i) => i % totalClient === userIdx);
    case "cifar10":
      return loadData("cifar10-agent", userIdx) as Dataset<DataFormat.Raw[D]>;
    case "cifar10_federated_simple_model":
    case "cifar10_simple_model":
      return loadData("cifar10_ext", userIdx) as Dataset<DataFormat.Raw[D]>;
    case "lus_covid":
    case "lus_covid_decentralized":
      return (await loadLusCovidData(userIdx, totalClient)) as Dataset<
        DataFormat.Raw[D]
      >;
    case "tinder_dog": // remove
      return loadTinderDogData(userIdx) as Dataset<DataFormat.Raw[D]>;
    case "mnist_federated":
    case "mnist":
      return loadData("mnist", userIdx) as Dataset<DataFormat.Raw[D]>;
    case "goldfish":
    case "centralized-gpt2-finetune": {
      const filePath =
        isValidation && validationDatasetPath
          ? validationDatasetPath
          : (datasetPath ?? "../datasets/med_mcq/train.txt");

      // Keep validation shared, but shard training data across clients by MCQ sample.
      if (isValidation) {
        return loadTextSamples(filePath) as Dataset<DataFormat.Raw[D]>;
      }

      return loadTextSamples(filePath, userIdx, totalClient) as Dataset<
        DataFormat.Raw[D]
      >;
    }
    default:
      throw new Error(`Data loader for ${taskID} not implemented.`);
  }
}
