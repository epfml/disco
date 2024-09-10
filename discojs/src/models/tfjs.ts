import { List, Map, Range } from "immutable";
import * as tf from '@tensorflow/tfjs'

import {
  Batched,
  Dataset,
  DataType,
  ModelEncoded,
  WeightsContainer,
} from "../index.js";

import { BatchLogs } from './index.js'
import { Model } from './index.js'
import { Prediction, Sample } from './model.js'
import { EpochLogs } from './logs.js'

type Serialized<D extends DataType = DataType> = [D, tf.io.ModelArtifacts]

/** TensorFlow JavaScript model with standard training */
export class TFJS<D extends DataType = DataType> extends Model<D> {
  /** Wrap the given trainable model */
  constructor (
    public readonly datatype: D,
    private readonly model: tf.LayersModel
  ) {
    super()

    if (model.loss === undefined) {
      throw new Error('TFJS models need to be compiled to be used')
    }
  }

  override get weights (): WeightsContainer {
    return new WeightsContainer(this.model.weights.map((w) => w.read()))
  }

  override set weights (ws: WeightsContainer) {
    this.model.setWeights(ws.weights)
  }

  override async *train(
    trainingDataset: Dataset<Batched<ModelEncoded[D]>>,
    validationDataset?: Dataset<Batched<ModelEncoded[D]>>,
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
    batch: Batched<ModelEncoded[D]>,
  ): Promise<Omit<BatchLogs, "batch">> {
    const { xs, ys } = this.#batchToTF(batch);

    const { history } = await this.model.fit(xs, ys, {
      epochs: 1,
      verbose: 0, // don't pollute
    });

    const { loss: losses, acc: accuracies } = history;
    if (
      losses === undefined ||
      accuracies === undefined ||
      typeof losses[0] !== "number" ||
      typeof accuracies[0] !== "number" ||
      isNaN(losses[0]) ||
      isNaN(accuracies[0])
    )
      throw new Error("training loss or accuracy is undefined or NaN");

    return {
      accuracy: accuracies[0],
      loss: losses[0],
      memoryUsage: tf.memory().numBytes / 1024 / 1024 / 1024,
    };
  }

  async #evaluate(
    dataset: Dataset<Batched<ModelEncoded[D]>>,
  ): Promise<Record<"accuracy" | "loss", number>> {
    const evaluation = await this.model.evaluateDataset(
      intoTFDataset(dataset.map((batch) => this.#batchToTF(batch))),
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

  override predict (input: Sample): Promise<Prediction> {
    const ret = this.model.predict(input)
    if (Array.isArray(ret)) {
      throw new Error('prediction yield many Tensors but should have only returned one')
    }

    return Promise.resolve(ret)
  }

  static async deserialize<D extends DataType = DataType>([
    datatype,
    artifacts,
  ]: Serialized<D>): Promise<TFJS<D>> {
    return new this(
      datatype,
      await tf.loadLayersModel({
        load: () => Promise.resolve(artifacts),
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

  [Symbol.dispose](): void{
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
    batch: Batched<ModelEncoded[D]>,
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
        const b = batch as Batched<ModelEncoded["image"]>;

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
              .map(([_, label]) =>
                tf.oneHot(label, outputSize, 1, 0, "int32"),
              )
              .toArray(),
          ),
        }));
      }
      case "tabular": {
        // cast as typescript doesn't reduce generic type
        const b = batch as Batched<ModelEncoded["tabular"]>;

        return {
          xs: tf.stack(
            b.map(([inputs]) => tf.tensor1d(inputs.toArray())).toArray(),
          ),
          ys: tf.stack(
            b.map(([_, outputs]) => tf.tensor1d(outputs.toArray())).toArray(),
          ),
        };
      }
      case "text": {
        // cast as typescript doesn't reduce generic type
        const b = batch as Batched<ModelEncoded["text"]>;

        return {
          xs: tf.stack(
            b.map(([line]) => tf.tensor1d(line.toArray())).toArray(),
          ),
          ys: tf.stack(
            b
              .map(([_, next]) => tf.oneHot(next.toArray(), outputSize))
              .toArray(),
          ),
        };
      }
    }

    const _: never = this.datatype;
    throw new Error("should never happen");
  }
}

function intoTFDataset<T extends tf.TensorContainer>(
  iter: AsyncIterable<T>,
): tf.data.Dataset<T> {
  // @ts-expect-error generator
  return tf.data.generator(async function* () {
    yield* iter;
  });
}
