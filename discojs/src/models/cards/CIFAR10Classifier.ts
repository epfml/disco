import { Model } from "#models/model";
import { ModelCard } from "#models/model_card";
import { getModel } from "#models/implementations/CIFAR10ClassifierModel";

export const CIFAR10Classifier: ModelCard<"image"> = {
  card: {
    id: "mobile_net_v1_cifar10",
    name: "Pre-trained CIFAR-10 Classifier",
    dataType: "image",
  },

  async getModel(): Promise<Model<"image">> {
    return await getModel();
  },
};
