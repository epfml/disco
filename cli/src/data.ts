import path from "node:path";

import type { Dataset, Image, Task, TypedRawDataset } from "@epfml/discojs";
import { loadCSV, loadImagesInDir } from "@epfml/discojs-node";
import { Repeat } from "immutable";

async function loadSimpleFaceData(): Promise<Dataset<[Image, string]>> {
  const folder = path.join("..", "datasets", "simple_face");

  const [adults, childs]: Dataset<[Image, string]>[] = [
    (await loadImagesInDir(path.join(folder, "adult"))).zip(Repeat("adult")),
    (await loadImagesInDir(path.join(folder, "child"))).zip(Repeat("child")),
  ];

  return adults.chain(childs);
}

async function loadLusCovidData(): Promise<Dataset<[Image, string]>> {
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

export async function getTaskData(task: Task): Promise<TypedRawDataset> {
  switch (task.id) {
    case "simple_face":
      return ["image", await loadSimpleFaceData()];
    case "titanic":
      return [
        "tabular",
        loadCSV(path.join("..", "datasets", "titanic_train.csv")),
      ];
    case "cifar10":
      return [
        "image",
        (await loadImagesInDir(path.join("..", "datasets", "CIFAR10"))).zip(
          Repeat("cat"),
        ),
      ];
    case "lus_covid":
      return ["image", await loadLusCovidData()];
    default:
      throw new Error(`Data loader for ${task.id} not implemented.`);
  }
}
