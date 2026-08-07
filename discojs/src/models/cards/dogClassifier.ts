import { Model } from "#models/model";
import { ModelCard } from "#models/model_card";
import { model } from "#models/implementations/dog_classifier";

export const DogClassifier: ModelCard<"image"> = {
  card: {
    id: "dog_classifier",
    name: "Dog Classifier",
    dataType: "image",
    preTrained: false,
  },

  async getModel(): Promise<Model<"image">> {
    return Promise.resolve(model());
  },
};
