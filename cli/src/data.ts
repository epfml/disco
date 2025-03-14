import path from "node:path";
import { Dataset, processing } from "@epfml/discojs";
import type {
  DataFormat,
  DataType,
  Image,
  Task,
} from "@epfml/discojs";
import { loadCSV, loadImage, loadImagesInDir } from "@epfml/discojs-node";
import { Repeat } from "immutable";

async function loadSimpleFaceData(): Promise<Dataset<DataFormat.Raw["image"]>> {
  const folder = path.join("..", "datasets", "simple_face");

  const [adults, childs]: Dataset<[Image, string]>[] = [
    (await loadImagesInDir(path.join(folder, "adult"))).zip(Repeat("adult")),
    (await loadImagesInDir(path.join(folder, "child"))).zip(Repeat("child")),
  ];

  return adults.chain(childs);
}

async function loadLusCovidData(): Promise<Dataset<DataFormat.Raw["image"]>> {
  const folder = path.join("..", "datasets", "lus_covid");

  const [positive, negative]: Dataset<[Image, string]>[] = [
    (await loadImagesInDir(path.join(folder, "COVID+"))).zip(
      Repeat("COVID-Positive"),
    ),
    (await loadImagesInDir(path.join(folder, "COVID-"))).zip(
      Repeat("COVID-Negative"),
    ),
  ];

  return positive.chain(negative);
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

export async function getTaskData<D extends DataType>(
  taskID: Task<D>['id'], userIdx: number
): Promise<Dataset<DataFormat.Raw[D]>> {
  switch (taskID) {
    case "simple_face":
      return (await loadSimpleFaceData()) as Dataset<DataFormat.Raw[D]>;
    case "titanic":
      return loadCSV(
        path.join("..", "datasets", "titanic_train.csv"),
      ) as Dataset<DataFormat.Raw[D]>;
    case "cifar10":
      return (
        await loadImagesInDir(path.join("..", "datasets", "CIFAR10"))
      ).zip(Repeat("cat")) as Dataset<DataFormat.Raw[D]>;
    case "lus_covid":
      return (await loadLusCovidData()) as Dataset<DataFormat.Raw[D]>;
    case "tinder_dog":
      return loadTinderDogData(userIdx) as Dataset<DataFormat.Raw[D]>;
    default:
      throw new Error(`Data loader for ${taskID} not implemented.`);
  }
}