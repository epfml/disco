export const dataTypeValues = ["image", "tabular", "text"] as const;
export type DataType = (typeof dataTypeValues)[number];
