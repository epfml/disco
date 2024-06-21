import { List } from "immutable";

export interface ValidationMetrics {
  accuracy: number;
  loss: number;
}

export interface BatchLogs {
  accuracy: number;
  loss: number;
  memoryUsage: number; // GB
}

export class EpochLogs {
  public readonly batches: List<BatchLogs>;

  constructor(
    batches: Iterable<BatchLogs>,
    public readonly validation?: ValidationMetrics,
  ) {
    this.batches = List(batches);
  }

  get training(): Record<"accuracy" | "loss", number> {
    const sum = this.batches.reduce(
      (acc, batch) => ({
        accuracy: acc.accuracy + batch.accuracy,
        loss: acc.loss + batch.loss,
      }),
      { loss: 0, accuracy: 0 },
    );

    return {
      accuracy: sum.accuracy / this.batches.size,
      loss: sum.loss / this.batches.size,
    };
  }

  get peakMemory(): number {
    return this.batches.map((batch) => batch.memoryUsage).max() ?? 0;
  }
}
