import { DataType } from "../types/index.js";

export interface DisplayInformation<D extends DataType> {
  title: string;
  summary: Summary;
  dataFormatInformation?: string;
  model?: string;
  dataExample?: DataExample<D>;
  sampleDataset?: SampleDataset;
}

interface Summary {
  preview: string;
  overview: string;
}

type DataExample<D extends DataType> = DataTypeToDataExample[D];
interface DataTypeToDataExample {
  // url to an image
  image: string;
  tabular: Array<{ name: string; data: string }>;
  text: string;
}

interface SampleDataset {
  // URL to download a dataset for the task, is displayed in the UI when asking to connect data
  link: string;
  // Instructions to download, unzip, and connect the right file of the sample dataset
  instructions: string;
}

export function isDisplayInformation<D extends DataType>(
  dataType: D,
  raw: unknown,
): raw is DisplayInformation<D> {
  if (typeof raw !== "object" || raw === null) return false;

  const {
    dataExample,
    dataFormatInformation,
    sampleDataset,
    model,
    summary,
    title,
  }: Partial<Record<keyof DisplayInformation<DataType>, unknown>> = raw;

  if (
    typeof title !== "string" ||
    (dataFormatInformation !== undefined &&
      typeof dataFormatInformation !== "string") ||
    (model !== undefined && typeof model !== "string") ||
    !isSummary(summary) ||
    (dataExample !== undefined && !isDataExample(dataType, dataExample)) ||
    (sampleDataset !== undefined && !isSampleDataset(sampleDataset))
  )
    return false;

  const _: DisplayInformation<D> = {
    dataExample,
    dataFormatInformation,
    sampleDataset,
    model,
    summary,
    title,
  } satisfies Record<keyof DisplayInformation<D>, unknown>;

  return true;
}

function isSummary(raw: unknown): raw is Summary {
  if (typeof raw !== "object" || raw === null) return false;

  const { preview, overview }: Partial<Record<keyof Summary, unknown>> = raw;

  if (!(typeof preview === "string" && typeof overview === "string"))
    return false;

  const _: Summary = {
    preview,
    overview,
  } satisfies Record<keyof Summary, unknown>;

  return true;
}

function isDataExample<D extends DataType>(
  dataType: D,
  raw: unknown,
): raw is DataExample<D> {
  switch (dataType) {
    case "image": {
      if (typeof raw !== "string") return false;
      if (raw !== undefined)
        try {
          new URL(raw);
        } catch {
          return false;
        }

      const _: DataExample<"image"> = raw;

      return true;
    }
    case "tabular": {
      if (!Array.isArray(raw)) return false;
      const columns: unknown[] = raw;
      if (
        !columns.every((col): col is Record<"name" | "data", string> => {
          if (typeof col !== "object" || col === null) return false;
          return (
            "name" in col &&
            "data" in col &&
            typeof col["name"] === "string" &&
            typeof col["data"] === "string"
          );
        })
      )
        return false;

      const _: DataExample<"tabular"> = columns;

      return true;
    }
    case "text": {
      if (typeof raw !== "string") return false;

      const _: DataExample<"text"> = raw;

      return true;
    }
  }

  return false;
}

function isSampleDataset(raw: unknown): raw is SampleDataset {
  if (typeof raw !== "object" || raw === null) return false;

  const { link, instructions }: Partial<Record<keyof SampleDataset, unknown>> =
    raw;

  if (!(typeof link === "string" && typeof instructions === "string"))
    return false;
  try {
    new URL(link);
  } catch {
    return false;
  }

  const _: SampleDataset = {
    link,
    instructions,
  } satisfies Record<keyof SampleDataset, unknown>;

  return true;
}
