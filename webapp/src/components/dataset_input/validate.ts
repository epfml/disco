import { Range, Set } from "immutable";

import type { LabeledDataset } from "./types";

export async function tabular(
  wantedColumns: Set<string>,
  dataset: LabeledDataset["tabular"],
): Promise<void> {
  for await (const [columns, i] of dataset
    .map((row) => Set(Object.keys(row)))
    .zip(Range(1)))
    if (!columns.isSuperset(wantedColumns))
      throw new Error(
        `row ${i} is missing columns ${wantedColumns.subtract(columns).join(", ")}`,
      );
}
