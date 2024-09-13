import path from "node:path";

import type { Dataset, DataType, Image, Raw, Task } from "@epfml/discojs";
import { loadCSV, loadImagesInDir } from "@epfml/discojs-node";
import { Repeat } from "immutable";

async function loadSimpleFaceData(): Promise<Dataset<Raw["image"]>> {
  const folder = path.join("..", "datasets", "simple_face");

  const [adults, childs]: Dataset<[Image, string]>[] = [
    (await loadImagesInDir(path.join(folder, "adult"))).zip(Repeat("adult")),
    (await loadImagesInDir(path.join(folder, "child"))).zip(Repeat("child")),
  ];

  return adults.chain(childs);
}

async function loadLusCovidData(): Promise<Dataset<Raw["image"]>> {
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

export async function getTaskData<D extends DataType>(
  task: Task<D>,
): Promise<Dataset<Raw[D]>> {
  switch (task.id) {
    case "simple_face":
      return (await loadSimpleFaceData()) as Dataset<Raw[D]>;
    case "titanic":
      return loadCSV(
        path.join("..", "datasets", "titanic_train.csv"),
      ) as Dataset<Raw[D]>;
    case "cifar10":
      return (
        await loadImagesInDir(path.join("..", "datasets", "CIFAR10"))
      ).zip(Repeat("cat")) as Dataset<Raw[D]>;
    case "lus_covid":
      return (await loadLusCovidData()) as Dataset<Raw[D]>;
    default:
      throw new Error(`Data loader for ${task.id} not implemented.`);
  }
}
