export * as DataFormat from "./data_format.js";

/**
 * The data that we handle goes through various stages.
 * The labels also gets transformed at each stage.
 *
 * raw -> model encoded -> inferred
 */

export type DataType = "image" | "tabular" | "text";
