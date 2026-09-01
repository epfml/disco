import type { Model } from "#models/model";
import type { ModelCard } from "#models/model_card";
import { model } from "#models/implementations/LUSClassifierModel";

export const LUSClassifier: ModelCard<"image"> = {
  card: {
    id: "lus_classifier",
    name: "LUS Classifier",
    dataType: "image",
  },

  async getModel(): Promise<Model<"image">> {
    return Promise.resolve(model());
  },
};
