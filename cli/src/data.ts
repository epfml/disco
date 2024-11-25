import path from "node:path";
import fs from 'node:fs/promises'
import { parse } from 'csv-parse';
import { Dataset } from "@epfml/discojs";
import type {
  DataFormat,
  DataType,
  Image,
  Task,
} from "@epfml/discojs";
import { loadCSV, loadImage, loadImagesInDir } from "@epfml/discojs-node";
import { Repeat, Map } from "immutable";

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

export async function loadTinderDogData(split: number): Promise<Dataset<DataFormat.Raw["image"]>> {
  const folder = path.join("..", "datasets", "tinder_dog", `${split + 1}`);
  console.log(`Reading data split ${folder}`)
  const csvPath = path.join(folder, 'labels.csv')

  const headers = ['filename', 'label'];
  const fileContent = await fs.readFile(csvPath, { encoding: 'utf-8' });
  const csvContent = await new Promise<{ filename: string, label: number }[]>((resolve, reject) => {
    parse(fileContent, {
      delimiter: ',',
      columns: headers,
    }, (error, result: { filename: string, label: number }[]) => {
      if (error) {
        console.error(error);
        reject(error)
      }
      resolve(result)
    });
  })
  const imgToLabel = Map(csvContent.map(entry =>
      [entry.filename, entry.label] as const)
  );
  const fileExtensions = [".png", ".jpg", ".jpeg"];
  const imagesFile = (await fs.readdir(folder)).filter(file => {
    for (const ext of fileExtensions) if(file.endsWith(ext)) return true;
    return false;
  })
  const labels = imagesFile.map(img => {
    const label = imgToLabel.get(img.slice(0, -4)) // remove the file extension
    if (label === undefined) throw Error(`Image ${img} not found in CSV`)
    return label.toString()
  })
  const imgPaths = imagesFile.map(imgName => path.join(folder, imgName))
  console.log(`Found ${imgPaths.length} in split ${split}`)
  const images = await Promise.all(imgPaths.map(imgPath => loadImage(imgPath)))
  
  return new Dataset(images).zip(labels)
}


export async function getTaskData<D extends DataType>(
  task: Task<D>,
): Promise<Dataset<DataFormat.Raw[D]>> {
  switch (task.id) {
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
    default:
      throw new Error(`Data loader for ${task.id} not implemented.`);
  }
}