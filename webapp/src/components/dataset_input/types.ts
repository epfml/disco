import type { Dataset, Image, Tabular, Text } from "@epfml/discojs";

type NamedImage = {
  image: Image;
  filename: string;
};
type NamedLabeledImage = NamedImage & {
  label: string;
};

export type NamedImageDataset = Dataset<NamedImage>;
export type NamedLabeledImageDataset = Dataset<NamedLabeledImage>;

type BasicTypedNamedDataset =
  | ["tabular", Dataset<Tabular>]
  | ["text", Dataset<Text>];
export type TypedNamedLabeledDataset =
  | BasicTypedNamedDataset
  | ["image", NamedLabeledImageDataset];
export type TypedNamedDataset =
  | BasicTypedNamedDataset
  | ["image", NamedImageDataset];
