import { Model, ModelCard } from "../index.js";
import { getModel } from "../implementations/mobileNetV2_face_classifier.js";

export const FaceClassifier: ModelCard<"image"> = {
  card: {
    id: "face_classifier",
    name: "Face Classifier",
    dataType: "image",
  },

  async getModel(): Promise<Model<"image">> {
    return await getModel();
  },
};
