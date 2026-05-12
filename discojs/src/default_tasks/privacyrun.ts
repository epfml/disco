import type { TaskProvider } from "../index.js";
import { Tokenizer, models, serialization } from "../index.js";

export const privacyrun: TaskProvider<"text", "federated"> = {
  async getTask() {
    return {
      id: 'privacyrun',
      dataType: "text",
      displayInformation: {
        title: "GPT Privacy-Preserving Fine-tuning",
        summary: {
          preview: 'Fine-tune a pre-trained GPT model collaboratively and privately.',
          overview: "Fine-tune a pre-trained GPT-2 model created by the ONNX converter in your browser collaboratively without sharing your raw data. The model is loaded from Google Cloud Storage and fine-tuned using federated learning."
        },
        model: [
          "The model is a pre-trained GPT-2 architecture converted from ONNX and loaded from Google Cloud Storage.",
          "The tokenizer used for preprocessing is the GPT-2 Byte-Pair encoding tokenizer.",
          "The model is trained via an Adam optimizer with unit gradient clipping and softmax cross-entropy loss.",
          "Context length is kept at 1024 to match the pre-trained model, with batch size at 1.",
        ].join(" "),
        dataFormatInformation: 'You can use any natural language (text) dataset. The dataset should be formatted as a plain text file with each line representing a segment of text.',
        dataExample:
          "For the first twenty years of its existence , the only staged performances of Parsifal took place in the Bayreuth Festspielhaus , the venue for which Wagner conceived the work.",
      },
      trainingInformation: {
        scheme: 'federated',
        aggregationStrategy: 'mean',
        minNbOfParticipants: 2,
        epochs: 1,
        validationSplit: 0.1, 
        roundDuration: 1,
        batchSize: 8,
        tokenizer: await Tokenizer.from_pretrained("Xenova/gpt2"),
        // contextLength: 1024,
        contextLength: 512,
        tensorBackend: 'gpt'
      }
    }
  },

  async getModel() {
    // Load the pre-trained ONNX-converted model from Google Cloud Storage
    // The model should be in DiscoJS serialization format (created by onnx-converter)
    // const modelUrl = "https://storage.googleapis.com/deai-313515.appspot.com/model.json";
    
    // const modelUrl = "https://storage.googleapis.com/deai-313515.appspot.com/model_ctx_512.json";

    const modelUrl = "https://storage.googleapis.com/deai-313515.appspot.com/model_ctx_512.json";

    try {
      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const encodedData = new Uint8Array(arrayBuffer);
      
      const model = await serialization.model.decode(encodedData);
      
      if (!(model instanceof models.GPT)) {
        throw new Error("Loaded model is not a GPT model");
      }

      console.log("Successfully loaded pre-trained GPT model from Google Cloud Storage");
      
      return model;
    } catch (error) {
      console.error("Failed to load model from Google Cloud Storage:", error);
      throw new Error(`Could not load model from ${modelUrl}. Make sure the URL is correct and the model exists in DiscoJS serialization format.`);
    }
  },
}
