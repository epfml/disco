import type { Dataset, Image, Raw, RawWithoutLabel } from "@epfml/discojs";

type NamedImage = {
  image: Image;
  filename: string;
};
type NamedLabeledImage = NamedImage & {
  label: string;
};

export type NamedImageDataset = Dataset<NamedImage>;
export type NamedLabeledImageDataset = Dataset<NamedLabeledImage>;

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
