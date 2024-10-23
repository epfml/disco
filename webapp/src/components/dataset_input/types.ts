import type { Dataset, DataFormat, Image } from "@epfml/discojs";

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
  tabular: Dataset<DataFormat.Raw["tabular"]>;
  text: Dataset<DataFormat.Raw["text"]>;
}
export interface UnlabeledDataset {
  image: NamedImageDataset;
  tabular: Dataset<DataFormat.RawWithoutLabel["tabular"]>;
  text: Dataset<DataFormat.RawWithoutLabel["text"]>;
}
