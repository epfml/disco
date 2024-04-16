// TODO use full type to check shape of array
export type Image = { width: number; height: number; data: Uint8Array };
export type Tabular = Partial<Record<string, string>>;
export type Text = string;
