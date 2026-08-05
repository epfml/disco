import * as tf from "@tensorflow/tfjs";

import { Model, TFJS } from "../index.js";

// Model architecture from tensorflow.js docs:
// https://codelabs.developers.google.com/codelabs/tfjs-training-classfication/index.html#4
export function model(): Model<"image"> {
  const imageHeight = 100;
  const imageWidth = 100;
  const imageChannels = 3;
  const numOutputClasses = 2;
  const model = tf.sequential();

  // In the first layer of our convolutional neural network we have
  // to specify the input shape. Then we specify some parameters for
  // the convolution operation that takes place in this layer.
  model.add(
    tf.layers.conv2d({
      inputShape: [imageHeight, imageWidth, imageChannels],
      kernelSize: 5,
      filters: 8,
      strides: 1,
      activation: "relu",
      kernelInitializer: "varianceScaling",
    }),
  );

  // The MaxPooling layer acts as a sort of downsampling using max values
  // in a region instead of averaging.
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));

  // Repeat the conv2d + maxPooling block.
  // Note that we have more filters in the convolution.
  model.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 16,
      strides: 1,
      activation: "relu",
      kernelInitializer: "varianceScaling",
    }),
  );
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));

  // Now we flatten the output from the 2D filters into a 1D vector to prepare
  // it for input into our last layer. This is common practice when feeding
  // higher dimensional data to a final classification output layer.
  model.add(tf.layers.flatten());

  // Our last layer is a dense layer which has 2 output units, one for each
  // output class.
  model.add(
    tf.layers.dense({
      units: numOutputClasses,
      kernelInitializer: "varianceScaling",
      activation: "softmax",
    }),
  );

  model.compile({
    optimizer: "sgd",
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });

  return new TFJS("image", model);
}
