import type {
  Dataset,
  Image,
  Raw,
  RawWithoutLabel,
  Tabular,
  Text,
} from "@epfml/discojs";

type NamedImage = {
  image: Image;
  filename: string;
};
type NamedLabeledImage = NamedImage & {
  label: string;
};

export type NamedImageDataset = Dataset<NamedImage>;
export type NamedLabeledImageDataset = Dataset<NamedLabeledImage>;

// TODO rm Typed*
type BasicTypedNamedDataset =
  | ["tabular", Dataset<Tabular>]
  | ["text", Dataset<Text>];
export type TypedNamedLabeledDataset =
  | BasicTypedNamedDataset
  | ["image", NamedLabeledImageDataset];
export type TypedNamedDataset =
  | BasicTypedNamedDataset
  | ["image", NamedImageDataset];

export interface LabeledDataset {
  image: NamedLabeledImageDataset;
  tabular: Dataset<Raw["tabular"]>;
  text: Dataset<Raw["text"]>;
}
export interface UnlabeledDataset {
  image: NamedImageDataset;
  tabular: Dataset<RawWithoutLabel["tabular"]>;
  text: Dataset<RawWithoutLabel["text"]>;
}
