import createDebug from "debug";
import { List, Map, Range } from "immutable";
import * as tf from '@tensorflow/tfjs'

import {
  Batched,
  Dataset,
  DataFormat,
  DataType,
  WeightsContainer,
} from "../index.js";

import { BatchLogs } from './index.js'
import { Model } from './index.js'
import { EpochLogs } from './logs.js'

const debug = createDebug("discojs:models:tfjs");

type Serialized<D extends DataType> = [D, tf.io.ModelArtifacts];

/** TensorFlow JavaScript model with standard training */
export class TFJS<D extends "image" | "tabular"> extends Model<D> {
  /** Wrap the given trainable model */
  constructor (
    public readonly datatype: D,
    private readonly model: tf.LayersModel
  ) {
    super()

    if (model.loss === undefined) {
      throw new Error('TFJS models need to be compiled to be used')
    }
    if (model.outputs.length !== 1)
      throw new Error("only support single output model")
  }

  override get weights (): WeightsContainer {
    return new WeightsContainer(this.model.weights.map((w) => w.read()))
  }

  override set weights (ws: WeightsContainer) {
    this.model.setWeights(ws.weights)
  }

  override async *train(
    trainingDataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
    validationDataset?: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): AsyncGenerator<BatchLogs, EpochLogs> {
    let batchesLogs = List<BatchLogs>();
    for await (const [batch, batchNumber] of trainingDataset.zip(Range())) {

      const batchLogs = {
        batch: batchNumber,
        ...(await this.#runBatch(batch)),
      };

      yield batchLogs;
      batchesLogs = batchesLogs.push(batchLogs);
    }

    const validation = validationDataset && (await this.#evaluate(validationDataset));
    return new EpochLogs(batchesLogs, validation);
  }

  async #runBatch(
    batch: Batched<DataFormat.ModelEncoded[D]>,
  ): Promise<BatchLogs> {
    const { xs, ys } = this.#batchToTF(batch);
    const logs = await this.trainFedProx(xs, ys);
    // const logs = await this.model.trainOnBatch(xs, ys);
    tf.dispose([xs, ys])
    return this.getBatchLogs(logs)
  }

  async trainFedProx(
    xs: tf.Tensor, ys: tf.Tensor): Promise<[number, number]> {
    // let logitsTensor: tf.Tensor<tf.Rank>;
    debug(this.model.loss, this.model.losses, this.model.lossFunctions)
    const lossFunction: () => tf.Scalar = () => {
      this.model.apply(xs)
      const logits = this.model.apply(xs)
          if (Array.isArray(logits))
            throw new Error('model outputs too many tensor')
          if (logits instanceof tf.SymbolicTensor)
            throw new Error('model outputs symbolic tensor')
          // logitsTensor = tf.keep(logits)
      // return tf.losses.softmaxCrossEntropy(ys, logits)
          let y: tf.Tensor;
          y = tf.clipByValue(logits, 0.00001, 1 - 0.00001);
          y = tf.log(tf.div(y, tf.sub(1, y)));
          return tf.losses.sigmoidCrossEntropy(ys, y);
          // return tf.losses.sigmoidCrossEntropy(ys, logits)
    }
    const lossTensor = this.model.optimizer.minimize(lossFunction, true)
    if (lossTensor === null) throw new Error("loss should not be null")
      // const lossTensor = tf.tidy(() => {
      //   const { grads, value: lossTensor } = this.model.optimizer.computeGradients(() => {
      //     const logits = this.model.apply(xs)
      //     if (Array.isArray(logits))
      //       throw new Error('model outputs too many tensor')
      //     if (logits instanceof tf.SymbolicTensor)
      //       throw new Error('model outputs symbolic tensor')
      //     logitsTensor = tf.keep(logits)
      //     // return tf.losses.softmaxCrossEntropy(ys, logits)
      //     return this.model.calculateLosses(ys, logits)[0]
      //   })
      //   this.model.optimizer.applyGradients(grads)
      //   return lossTensor
      // })
  
      // // @ts-expect-error Variable 'logitsTensor' is used before being assigned
      // const accTensor = tf.metrics.categoricalAccuracy(ys, logitsTensor)
      // const accSize = accTensor.shape.reduce((l, r) => l * r, 1)
      // const accSumTensor = accTensor.sum()
      // const accSum = await accSumTensor.array()
      // if (typeof accSum !== 'number')
      //   throw new Error('got multiple accuracy sum')
      // // @ts-expect-error Variable 'logitsTensor' is used before being assigned
      // tf.dispose([accTensor, accSumTensor, logitsTensor])
      
      const loss = await lossTensor.array()
      tf.dispose([xs, ys, lossTensor])
      
      // const memory = tf.memory().numBytes / 1024 / 1024 / 1024
      // debug("training metrics: %O", {
      //   loss,
      //   memory,
      //   allocated: tf.memory().numTensors,
      // });
      return [loss, 0]
      // return [loss, accSum / accSize]
  }

  async #evaluate(
    dataset: Dataset<Batched<DataFormat.ModelEncoded[D]>>,
  ): Promise<Record<"accuracy" | "loss", number>> {
    const evaluation = await this.model.evaluateDataset(
      tf.data.generator(
        async function* (this: TFJS<D>) {
          yield* dataset.map((batch) => this.#batchToTF(batch));
        }.bind(this),
      ),
    );
    const metricToValue = Map(
      List(this.model.metricsNames).zip(
        Array.isArray(evaluation)
          ? List(await Promise.all(evaluation.map((t) => t.data())))
          : List.of(await evaluation.data()),
      ),
    ).map((values) => {
      if (values.length !== 1) throw new Error("more than one metric value");
      return values[0];
    });
    tf.dispose(evaluation)

    const [accuracy, loss] = [
      metricToValue.get("acc"),
      metricToValue.get("loss"),
    ];
    if (accuracy === undefined || loss === undefined)
      throw new Error("some needed metrics are missing");

    return { accuracy, loss };
  }

  override async predict(
    batch: Batched<DataFormat.ModelEncoded[D][0]>,
  ): Promise<Batched<DataFormat.ModelEncoded[D][1]>> {
    async function cleanupPredicted(y: tf.Tensor1D): Promise<number> {
      if (y.shape[0] === 1) {
        // Binary classification
        const threshold = tf.scalar(0.5);
        const binaryTensor = y.greaterEqual(threshold);

        const binaryArray = await binaryTensor.data();
        tf.dispose([y, binaryTensor, threshold]);

        return binaryArray[0];
      }

      // Multi-class classification
      const indexTensor = y.argMax();

      const indexArray = await indexTensor.data();
      tf.dispose([y, indexTensor]);

      return indexArray[0];

      // Multi-label classification is not supported
    }

    const xs = this.#batchWithoutLabelToTF(batch);

    const prediction = this.model.predict(xs);
    if (Array.isArray(prediction))
      throw new Error(
        "prediction yield many Tensors but should have only returned one",
      );
    tf.dispose(xs);

    if (prediction.rank !== 2)
      throw new Error("unexpected batched prediction shape");

    const ret = List(
      await Promise.all(
        tf.unstack(prediction).map((y) =>
          cleanupPredicted(
            // cast as unstack reduce by one the rank
            y as tf.Tensor1D,
          ),
        ),
      ),
    );
    prediction.dispose();

    return ret
  }

  static async deserialize<D extends "image" | "tabular">([
    datatype,
    artifacts,
  ]: Serialized<D>): Promise<TFJS<D>> {
    return new this(
      datatype,
      await tf.loadLayersModel({
        load: () => {
          console.log("deserialize called")
          return Promise.resolve(artifacts)
        },
      }),
    );
  }


  async serialize (): Promise<Serialized<D>> {
    let resolveArtifacts: (_: tf.io.ModelArtifacts) => void
    const ret = new Promise<tf.io.ModelArtifacts>((resolve) => { resolveArtifacts = resolve })

    await this.model.save({
      save: (artifacts) => {
        resolveArtifacts(artifacts)
        return Promise.resolve({
          modelArtifactsInfo: {
            dateSaved: new Date(),
            modelTopologyType: 'JSON'
          }
        })
      }
    }, {
      includeOptimizer: true // keep model compiled
    })

    return [this.datatype, await ret]
  }

  [Symbol.dispose](): void {
    this.model.dispose()
  }

  /**
   * extract wrapped model
   *
   * @deprecated use `Model` instead of relying on tf specifics
   */
  extract (): tf.LayersModel {
    return this.model
  }

  #batchToTF(
    batch: Batched<DataFormat.ModelEncoded[D]>,
  ): Record<"xs" | "ys", tf.Tensor> {
    const outputSize = tf.util.sizeFromShape(
      this.model.outputShape.map((dim) => {
        if (Array.isArray(dim))
          throw new Error("TODO support multiple outputs");
        return dim ?? 1;
      }),
    );

    switch (this.datatype) {
      case "image": {
        // cast as typescript doesn't reduce generic type
        const b = batch as Batched<DataFormat.ModelEncoded["image"]>;

        return tf.tidy(() => ({
          xs: tf.stack(
            b
              .map(([image]) =>
                tf.tensor3d(
                  image.data,
                  [image.width, image.height, 3],
                  "float32",
                ),
              )
              .toArray(),
          ),
          ys: tf.stack(
            b
              .map(([_, label]) => tf.oneHot(label, outputSize, 1, 0, "int32"))
              .toArray(),
          ),
        }));
      }
      case "tabular": {
        // cast as typescript doesn't reduce generic type
        const b = batch as Batched<DataFormat.ModelEncoded["tabular"]>;

        return tf.tidy(() => ({
          xs: tf.stack(
            b.map(([inputs, _]) => tf.tensor1d(inputs.toArray())).toArray(),
          ),
          ys: tf.stack(b.map(([_, output]) => tf.tensor1d([output])).toArray()),
        }));
      }
    }

    const _: never = this.datatype;
    throw new Error("should never happen");
  }

  #batchWithoutLabelToTF(
    batch: Batched<DataFormat.ModelEncoded[D][0]>,
  ): tf.Tensor {
    switch (this.datatype) {
      case "image": {
        // cast as typescript doesn't reduce generic type
        const b = batch as Batched<DataFormat.ModelEncoded["image"][0]>;

        return tf.tidy(() => tf.stack(
            b
              .map((image) =>
                tf.tensor3d(
                  image.data,
                  [image.width, image.height, 3],
                  "float32",
                ),
              )
              .toArray(),
          ),
        );
      }
      case "tabular": {
        // cast as typescript doesn't reduce generic type
        const b = batch as Batched<DataFormat.ModelEncoded["tabular"][0]>;

        return tf.tidy(() =>
          tf.stack(
            b.map((inputs) => tf.tensor1d(inputs.toArray())).toArray(),
          ),
        );
      }
    }

    const _: never = this.datatype;
    throw new Error("should never happen");
  }
}
