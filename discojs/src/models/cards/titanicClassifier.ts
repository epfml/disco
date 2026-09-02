import type { Model } from "#models/model";
import type { ModelCard } from "#models/model_card";
import { model } from "#models/implementations/titanicClassifierModel";

export const TitanicClassifier: ModelCard<"tabular"> = {
  card: {
    id: "titanic_classifier",
    name: "Titanic classifier",
    dataType: "tabular",
  },

  async getModel(): Promise<Model<"tabular">> {
    return Promise.resolve(model());
  },
};
