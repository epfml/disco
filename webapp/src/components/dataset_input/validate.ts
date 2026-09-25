import { Range, Set } from "immutable";

import { isMissingValue } from "@epfml/discojs";

import type { LabeledDataset } from "./types";

export async function tabular(
  wantedColumns: Set<string>,
  dataset: LabeledDataset["tabular"],
): Promise<void> {
  for await (const [row, i] of dataset.zip(
    Range(1, Number.POSITIVE_INFINITY),
  )) {
    const columns = Set(Object.keys(row));

    if (!columns.isSuperset(wantedColumns))
      throw new Error(
        `row ${i} is missing columns ${wantedColumns.subtract(columns).join(", ")}`,
      );

    for (const col of wantedColumns) {
      if (isMissingValue(row[col]))
        throw new Error(`row ${i} column "${col}" is missing a value`);
    }
  }
}
