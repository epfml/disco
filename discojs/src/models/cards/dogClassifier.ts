import { Model, ModelCard } from "../index.js";
import { model } from "../implementations/dog_classifier.js";

export const DogClassifier: ModelCard<"image"> = {
  card: {
    id: "dog_classifier",
    name: "Dog Classifier",
    preTrained: false,
  },

  async getModel(): Promise<Model<"image">> {
    return Promise.resolve(model());
  },
};
