import * as tf from '@tensorflow/tfjs';

/*
 * This class defines a new type of Layer for Interoperability personalization.
 * It performs the operation (input + bias) [Hadamard Product] weights
 * as defined in David Roschewit's paper on Interoperability (https://arxiv.org/abs/2107.06580).
 *
 * The idea is to wrap a given model between two interoperability layers and train it like that.
 * It allows us to learn a feature-shift and a target-shift with respect to the federation.
 * The values of weight and biases are directly interpretable to understand differences in distributions of features.
 */

export class InteroperabilityLayer extends tf.layers.Layer {
  constructor(config) {
    super(config);
    this.units = config.units;
    this.inputShape = config.inputShape;
  }

  // TODO: Maybe make it more resilient,
  // and automatically take as input the size of previous layer but for now it's not 100% mandatory I guess
  // Since we know the layer keep as many output as inputs, it's fine to use unit but it's not the best
  /**
   * build() is called when the custom layer object is connected to an
   * upstream layer for the first time.
   */
  build() {
    this.weight = this.addWeight(
      'weight',
      [this.units],
      'float32',
      tf.initializers.ones()
    );
    this.bias = this.addWeight(
      'bias',
      [this.units],
      'float32',
      tf.initializers.zeros()
    );
  }

  /**
   * call() contains the actual numerical computation of the layer.
   *
   * It is "tensor-in-tensor-out". I.e., it receives one or more
   * tensors as the input and should produce one or more tensors as
   * the return value.
   *
   * Be sure to use tidy() to avoid WebGL memory leak.
   */
  call(input) {
    return tf.tidy(() => {
      const sum = tf.add(input[0], this.bias.read());
      return tf.mul(sum, this.weight.read());
    });
  }

  /**
   * getConfig() generates the JSON object that is used
   * when saving and loading the custom layer object.
   */
  getConfig() {
    const config = super.getConfig();
    Object.assign(config, {
      units: this.units,
      inputShape: this.inputShape,
      weight: this.weight,
      bias: this.bias,
    });
    return config;
  }

  /**
   * The static className getter is required by the
   * registration step (see below).
   */
  static get className() {
    return 'InteroperabilityLayer';
  }
}

/**
 * Regsiter the custom layer, so TensorFlow.js knows what class constructor
 * to call when deserializing an saved instance of the custom layer.
 */
tf.serialization.registerClass(InteroperabilityLayer);
