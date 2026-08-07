import { Model } from "#models/model";
import { ModelCard } from "#models/model_card";
import { model } from "#models/implementations/pytorch_mnist_classifier";

export const PytorchMNISTClassifier: ModelCard<"image"> = {
  card: {
    id: "mnist_classifier",
    name: "MNIST Classifier",
    dataType: "image",
    preTrained: false,
  },

  async getModel(): Promise<Model<"image">> {
    return Promise.resolve(model());
  },
};
