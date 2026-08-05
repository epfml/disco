import type { TaskProvider } from "#task/index";
import { cards } from "#models/index";

export const tinderDog: TaskProvider<"image", "federated"> = {
  getTask() {
    return Promise.resolve({
      id: "tinder_dog",
      dataType: "image",
      displayInformation: {
        title: "GDHF 2024 | TinderDog",
        summary: {
          preview: "Which dog is the cutest....or not?",
          overview: "Binary classification model for dog cuteness.",
        },
        model:
          "The model is a simple Convolutional Neural Network composed of two convolutional layers with ReLU activations and max pooling layers, followed by a fully connected output layer. The data preprocessing reshapes images into 64x64 pixels and normalizes values between 0 and 1",
        dataFormatInformation:
          "Accepted image formats are .png .jpg and .jpeg.",
        dataExample:
          "https://storage.googleapis.com/deai-313515.appspot.com/tinder_dog_preview.png",
        sampleDataset: {
          link: "https://storage.googleapis.com/deai-313515.appspot.com/tinder_dog.zip",
          instructions:
            'Opening the link should start downloading a zip file which you can unzip. To connect the data, pick one of the data splits (the folder 0 for example) and use the CSV option below to select the file named "labels.csv". You can now connect the images located in the same folder.',
        },
      },
      trainingInformation: {
        epochs: 10,
        roundDuration: 2,
        validationSplit: 0, // nicer plot for GDHF demo
        batchSize: 10,
        IMAGE_H: 64,
        IMAGE_W: 64,
        LABEL_LIST: ["Cute dogs", "Less cute dogs"],
        scheme: "federated",
        aggregationStrategy: "mean",
        minNbOfParticipants: 3,
        tensorBackend: "tfjs",
      },
    });
  },

  modelCard: cards.DogClassifier,
};
