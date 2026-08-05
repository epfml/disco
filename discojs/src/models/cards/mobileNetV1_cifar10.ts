import { Model, ModelCard } from "../index.js";
import { getModel } from "../implementations/mobileNetV1_cifar10.js";

export const CIFAR10Classifier: ModelCard<"image"> = {
  card: {
    id: "mobile_net_v1_cifar10",
    name: "Pre-trained CIFAR-10 Classifier",
    preTrained: true,
  },

  async getModel(): Promise<Model<"image">> {
    return await getModel();
  },
};
