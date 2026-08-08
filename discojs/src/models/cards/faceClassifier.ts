import type { Model } from "#models/model";
import type { ModelCard } from "#models/model_card";
import { getModel } from "#models/implementations/mobileNetV2_face_classifier";

export const FaceClassifier: ModelCard<"image"> = {
  card: {
    id: "face_classifier",
    name: "Face Classifier",
    dataType: "image",
    preTrained: false,
  },

  async getModel(): Promise<Model<"image">> {
    return await getModel();
  },
};
