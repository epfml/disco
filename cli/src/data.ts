import path from "node:path";
import { promises as fs } from "fs";
import { Dataset, processing, defaultTasks } from "@epfml/discojs";
import {
  DataFormat,
  DataType,
  Image,
  Task,
} from "@epfml/discojs";
import { loadCSV, loadImage, loadImagesInDir } from "@epfml/discojs-node";
import { Repeat } from "immutable";

async function loadSimpleFaceData(userIdx: number, totalClient: number): Promise<Dataset<DataFormat.Raw["image"]>> {
  const folder = path.join("..", "datasets", "simple_face");

  const [adults, childs]: Dataset<[Image, string]>[] = [
    (await loadImagesInDir(path.join(folder, "adult"))).zip(Repeat("adult")),
    (await loadImagesInDir(path.join(folder, "child"))).zip(Repeat("child")),
  ];

  const combinded = adults.chain(childs);

  return combinded.filter((_, i) => i % totalClient === userIdx);
}

async function loadLusCovidData(userIdx: number, totalClient: number): Promise<Dataset<DataFormat.Raw["image"]>> {
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

async function loadExtCifar10(userIdx: number): Promise<Dataset<[Image, string]>> {
  const CIFAR10_LABELS = Array.from(await defaultTasks.cifar10.getTask().then(t => t.trainingInformation.LABEL_LIST));
  const folder = path.join("..", "datasets", "extended_cifar10");
  const clientFolder = path.join(folder, `client_${userIdx}`);

  return new Dataset(async function*(){
    const entries = await fs.readdir(clientFolder, {withFileTypes: true});

    const items = entries
        .flatMap((e) => {
          const m = e.name.match(
            /^image_(\d+)_label_(\d+)\.png$/i
          );
          if (m === null) return [];
          const labelIdx = Number.parseInt(m[2], 10);

          if(labelIdx >= CIFAR10_LABELS.length)
            throw new Error(`${e.name}: too big label index`);

          return {
            name: e.name,
            label: CIFAR10_LABELS[labelIdx],
          };
        })
        .filter((x) => x !== null)

      for (const {name, label} of items){
        const filePath = path.join(clientFolder, name);
        const image = await loadImage(filePath);
        yield [image, label] as const;
      }
  })
}

function loadMnistData(split: number): Dataset<DataFormat.Raw["image"]>{
  const folder = path.join("..", "datasets", "mnist", `${split + 1}`);
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
	taskID: Task.ID,
	userIdx: number,
  totalClient: number
): Promise<Dataset<DataFormat.Raw[D]>> {
  switch (taskID) {
    case "simple_face":
      return (await loadSimpleFaceData(userIdx, totalClient)) as Dataset<DataFormat.Raw[D]>;
    case "titanic":
      const titanicData = loadCSV(
        path.join("..", "datasets", "titanic_train.csv"),
      ) as Dataset<DataFormat.Raw[D]>;
      return titanicData.filter((_, i) => i % totalClient === userIdx);
    case "cifar10":
      return (
        await loadImagesInDir(path.join("..", "datasets", "CIFAR10"))
      ).zip(Repeat("cat")) as Dataset<DataFormat.Raw[D]>;
    case "lus_covid":
      return (await loadLusCovidData(userIdx, totalClient)) as Dataset<DataFormat.Raw[D]>;
    case "tinder_dog":
      return loadTinderDogData(userIdx) as Dataset<DataFormat.Raw[D]>;
    case "extended_cifar10":
      return (await loadExtCifar10(userIdx)) as Dataset<DataFormat.Raw[D]>;    
    case "mnist":
      return loadMnistData(userIdx) as Dataset<DataFormat.Raw[D]>;
    default:
      throw new Error(`Data loader for ${taskID} not implemented.`);
  }
}
