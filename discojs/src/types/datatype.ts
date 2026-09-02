export const dataTypeValues = ["image", "tabular", "text"] as const;

export type DataType = (typeof dataTypeValues)[number];

export function isDataType(x: unknown): x is DataType {
  return (
    typeof x == "string" && (dataTypeValues as readonly string[]).includes(x)
  );
}
