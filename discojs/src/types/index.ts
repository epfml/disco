export * as DataFormat from "./data_format.js";

export const dataTypeValues = ["image", "tabular", "text"] as const;
export type DataType = (typeof dataTypeValues)[number];
export type Network = "decentralized" | "federated" | "local";
