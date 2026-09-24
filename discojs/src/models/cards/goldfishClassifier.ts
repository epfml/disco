import type { Model } from "#models/model";
import type { ModelCard } from "#models/model_card";
import { GPT } from "#models/implementations/index";
import { decode as modelDecode } from "#serialization/model";

export const Goldfish: ModelCard<"text"> = {
  card: {
    id: "goldfish",
    name: "Privacy-Preserving Fine-tuning of GPT-2",
    dataType: "text",
    contextLength: 512,
  },

  async getModel(): Promise<Model<"text">> {
    // Load the pre-trained ONNX-converted model from Google Cloud Storage
    // The model should be in DiscoJS serialization format (created by onnx-converter)
    // const modelUrl = "https://storage.googleapis.com/deai-313515.appspot.com/model.json";

    const modelUrl =
      "https://storage.googleapis.com/deai-313515.appspot.com/model_ctx_512.json";

    try {
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const encodedData = new Uint8Array(arrayBuffer);

      const model = await modelDecode(encodedData);

      if (!(model instanceof GPT)) {
        throw new Error("Loaded model is not a GPT model");
      }

      console.log(
        "Successfully loaded pre-trained GPT model from Google Cloud Storage",
      );

      return model;
    } catch (error) {
      console.error("Failed to load model from Google Cloud Storage:", error);
      throw new Error(
        `Could not load model from ${modelUrl}. Make sure the URL is correct and the model exists in DiscoJS serialization format.`,
      );
    }
  },
};
