import { Model } from "#models/model";
import { ModelCard } from "#models/model_card";
import { model } from "#models/implementations/MNISTClassifierModel";

export const MNISTClassifier: ModelCard<"image"> = {
  card: {
    id: "mnist_classifier",
    name: "MNIST Classifier",
    dataType: "image",
  },

  async getModel(): Promise<Model<"image">> {
    return Promise.resolve(model());
  },
};
