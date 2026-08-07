import { Model, ModelCard } from "#models/index";
import { getModel } from "#models/implementations/mobileNetV1_cifar10";

export const CIFAR10Classifier: ModelCard<"image"> = {
  card: {
    id: "mobile_net_v1_cifar10",
    name: "Pre-trained CIFAR-10 Classifier",
    dataType: "image",
    preTrained: true,
  },

  async getModel(): Promise<Model<"image">> {
    return await getModel();
  },
};
