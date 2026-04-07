import { Range, Set } from "immutable";

import type { LabeledDataset } from "./types";

function isNaNValue(value: string | undefined): boolean{
  if (value === undefined)
    return true;

  const trimmed = value.trim();
  return trimmed === "" || trimmed.toLowerCase() === "nan";
}

export async function tabular(
  wantedColumns: Set<string>,
  dataset: LabeledDataset["tabular"],
): Promise<void> {
  for await (const [row, i] of dataset
    .zip(Range(1, Number.POSITIVE_INFINITY))){
      const columns = Set(Object.keys(row));

      if (!columns.isSuperset(wantedColumns))
        throw new Error(
          `row ${i} is missing columns ${wantedColumns.subtract(columns).join(", ")}`,
        );

      for (const col of wantedColumns){
        if (isNaNValue(row[col]))
          throw new Error(`row ${i} column "${col}" contains NaN`);
      }
    }
}
