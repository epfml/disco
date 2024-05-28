import path from "node:path";

import type { Dataset, Image, Task, TypedDataset, data } from "@epfml/discojs";
import { parseCSV, parseImagesInDir } from "@epfml/discojs-node";
import { Repeat } from "immutable";

async function loadSimpleFaceData(): Promise<Dataset<[Image, string]>> {
  const folder = "../datasets/simple_face";

  const [adults, childs]: Dataset<[Image, string]>[] = [
    (await parseImagesInDir(path.join(folder, "adult"))).zip(Repeat("adult")),
    (await parseImagesInDir(path.join(folder, "child"))).zip(Repeat("child")),
  ];

  return adults.chain(childs);
}

async function loadLusCovidData(): Promise<Dataset<[Image, string]>> {
  const folder = "../datasets/lus_covid";

  const [positive, negative]: Dataset<[Image, string]>[] = [
    (await parseImagesInDir(path.join(folder, "COVID+"))).zip(
      Repeat("COVID-Positive"),
    ),
    (await parseImagesInDir(path.join(folder, "COVID-"))).zip(
      Repeat("COVID-Negative"),
    ),
  ];

  return positive.chain(negative);
}

export async function getTaskData(
  task: Task,
): Promise<data.DataSplit | TypedDataset> {
  switch (task.id) {
    case "simple_face":
      return ["image", await loadSimpleFaceData()];
    case "titanic":
      return ["tabular", parseCSV("../datasets/lus_covid/titanic_train.csv")];
    case "cifar10":
      return [
        "image",
        (await parseImagesInDir(path.join("..", "datasets", "CIFAR10"))).zip(
          Repeat("cat"),
        ),
      ];
    case "lus_covid":
      return ["image", await loadLusCovidData()];
    default:
      throw new Error(`Data loader for ${task.id} not implemented.`);
  }
}
