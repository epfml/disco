import { Task, data, TaskProvider } from '..'
import * as tf from '@tensorflow/tfjs-node'
import { Kwargs } from '@tensorflow/tfjs-layers/dist/types'

async function resnet50 (
    pretrainedPath: string
): Promise<tf.LayersModel> {
    const handler = tf.io.fileSystem(pretrainedPath);
    const resnet50 = await tf.loadLayersModel(handler);
    
    return resnet50;
}

class L2Convolution_ extends tf.layers.Layer {
    private config: Object;
    private prototypeShape: number[];
    private featureShape: number[];

    private prototypeVectors: tf.LayerVariable;
    private ones: tf.LayerVariable;

    constructor(config: any) {
        super(config);

        this.config = Object.assign({ name: 'l2_convolution' }, config); 
        this.name = 'l2_convolution';
        this.prototypeShape = [config.prototypeShape[1], config.prototypeShape[2], config.prototypeShape[3], config.prototypeShape[0]];
        this.featureShape = config.featureShape;
    }

    build(inputShape: tf.Shape | tf.Shape[]): void {
        this.prototypeVectors = this.addWeight('proto_vec', this.prototypeShape, 'float32', tf.initializers.randomUniform({ minval: 0, maxval: 1 }));
        this.ones = this.addWeight('ones', this.prototypeShape, 'float32', tf.initializers.ones(), undefined, false);
    }

    computeOutputShape(inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
        return [null, this.featureShape[0], this.featureShape[1], this.prototypeShape[3]];
    }

    getConfig(): tf.serialization.ConfigDict {
        const config = super.getConfig();
        return Object.assign({}, config, this.config);
    }

    call(inputs: tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[], kwargs: Kwargs): tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[] {
        return tf.tidy(() => {
            if (Array.isArray(inputs)) {
                inputs = inputs[0];
            }
            this.invokeCallHook(inputs, kwargs);

            // B = batchSize, P = prototype, D = dimension, N = number
            const x2 = tf.square(inputs) as tf.Tensor4D;    // [B, 7, 7, PD]
            const x2_patch_sum = tf.conv2d(
                x2,
                this.ones.read() as tf.Tensor4D,
                1,
                'valid'
            );                                              // [B, 7, 7, PN]

            let p2 = tf.square(this.prototypeVectors.read());
            p2 = tf.sum(p2, [0, 1, 2], false);
            p2 = tf.reshape(p2, [1, 1, -1]);                // [PN]

            let xp = tf.conv2d(
                inputs as tf.Tensor4D,
                this.prototypeVectors.read() as tf.Tensor4D,
                1,
                'valid'
            );
            xp = tf.mul(xp, tf.scalar(-2));                 // [B, 7, 7, PN]

            const intermediate_result = tf.add(xp, p2);
            const distances = tf.relu(tf.add(x2_patch_sum, intermediate_result));

            return distances;
        })
    }

    static get className(): string {
        return 'L2Convolution';
    }
}
tf.serialization.registerClass(L2Convolution_);
const L2Convolution = (config: any) => new L2Convolution_(config);

class Distance2Similarity_ extends tf.layers.Layer {
    private config: Object;
    private epsilon: number;
    private prototypeActivationFunction: string;

    constructor(config: any) {
        super(config);

        this.config = Object.assign({ name: 'distance_to_similarity' }, config); 
        this.name = 'distance_to_similarity';
        this.prototypeActivationFunction = config.prototypeActivationFunction;
        this.epsilon = 1e-4;
    }

    computeOutputShape(inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
        return inputShape;
    }

    call(inputs: tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[], kwargs: Kwargs): tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[] {
        return tf.tidy(() => {
            if (Array.isArray(inputs)) {
                inputs = inputs[0];
            }
            this.invokeCallHook(inputs, kwargs);
            return tf.log(
                tf.div(
                    tf.add(inputs, tf.scalar(1)),
                    tf.add(inputs, tf.scalar(this.epsilon))
                ) 
            )
        })
    }

    static get className(): string {
        return 'Distance2Similarity';
    }
}
tf.serialization.registerClass(Distance2Similarity_);
const Distance2Similarity = (config: any) => new Distance2Similarity_(config);

class MinDistancesPooling_ extends tf.layers.Layer {
    private config: Object;
    private kernelSize: [number, number];
    private numPrototypes: number;

    constructor(config: any) {
        super(config);

        this.config = Object.assign({ name: 'min_distances' }, config); 
        this.name = 'min_distances';
        this.kernelSize = [config.featureShape[0], config.featureShape[1]];
        this.numPrototypes = config.prototypeShape[0];
    }

    computeOutputShape(inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
        return [null, this.numPrototypes];
    }
    
    getConfig(): tf.serialization.ConfigDict {
        const config = super.getConfig();
        return Object.assign({}, config, this.config);
    }

    call(inputs: tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[], kwargs: Kwargs): tf.Tensor<tf.Rank> | tf.Tensor<tf.Rank>[] {
        return tf.tidy(() => {
            if (Array.isArray(inputs)) {
                inputs = inputs[0];
            }
            this.invokeCallHook(inputs, kwargs);

            let distances = tf.mul(inputs, tf.scalar(-1)) as tf.Tensor4D;
            let minDistances = tf.pool(
                distances,
                this.kernelSize,
                'max',
                'valid'
            ) as tf.Tensor;
            minDistances = tf.mul(minDistances, tf.scalar(-1));                 // [B, 1, 1, PN]
            minDistances = tf.reshape(minDistances, [-1, this.numPrototypes])   // [B, PN]

            return minDistances;
        })
    }

    static get className(): string {
        return 'MinDistancesPooling';
    }
}
tf.serialization.registerClass(MinDistancesPooling_);
const MinDistancesPooling = (config: any) => new MinDistancesPooling_(config);

async function convFeatures (cfg: any): Promise<tf.LayersModel> {
    const config = Object.assign(
        {
            name: 'features',
        }, 
        cfg
    );
    const inputs = tf.input({ shape: [config.imgSize, config.imgSize, 3] });
    let x: tf.Tensor | tf.SymbolicTensor | tf.Tensor[] | tf.SymbolicTensor[];

    x = (await resnet50(config.pretrainedPath)).apply(inputs) as tf.SymbolicTensor;
    x = tf.layers.conv2d({
        name: 'add_on_layer/conv2_1',
        filters: config.prototypeShape[3],
        kernelSize: 1,
        kernelInitializer: 'glorotUniform',
        activation: 'relu'
    }).apply(x);
    
    x = tf.layers.conv2d({
        name: 'add_on_layer/conv2d_2',
        filters: config.prototypeShape[3],
        kernelSize: 1,
        kernelInitializer: 'glorotUniform',
        activation: 'sigmoid'
    }).apply(x) as tf.SymbolicTensor;
    
    return tf.model({ name: config.name, inputs: inputs, outputs: x });
}

function protoPartLoss (cfg: any, protoClassId: tf.Tensor) {
    return (yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor => {
        const labels = yTrue.argMax(1);

        // cluster cost
        const maxDistance = cfg.prototypeShape[1] * cfg.prototypeShape[2] * cfg.prototypeShape[3];
        const prototypesOfCorrectClass = tf.transpose(protoClassId.gather(labels, 1));

        const invertedDistances = tf.max(
            tf.mul(tf.sub(maxDistance, yPred), prototypesOfCorrectClass),
            1
        );

        const clusterCost = tf.mean(tf.sub(maxDistance, invertedDistances)); 

        // separation cost
        const prototypesOfWrongClass = tf.sub(1, prototypesOfCorrectClass);
        const invertedDistancesNontarget = tf.max(
            tf.mul(tf.sub(maxDistance, yPred), prototypesOfWrongClass),
            1
        );

        const separationCost = tf.mean(tf.sub(maxDistance, invertedDistancesNontarget));

        return tf.addN([
            tf.mul(tf.scalar(0.8), clusterCost),
            tf.mul(tf.scalar(-0.08), separationCost)
        ]);
    }
}

function getProtoClassIdx (cfg: any): tf.Tensor {
    const config = Object.assign({}, cfg);
    const numClasses = config.numClasses;
    const numPrototypes = config.prototypeShape[0];

    const numPrototypePerClasses = Math.floor(numPrototypes / numClasses);
    const protoClassId = tf.zeros([numPrototypes, numClasses]);
    let protoClassIdBuffer = tf.buffer(protoClassId.shape, protoClassId.dtype, protoClassId.dataSync())

    for (let j = 0; j < numPrototypes; j++) {
       protoClassIdBuffer.set(1, j, Math.floor(j / numPrototypePerClasses));
    }

    return protoClassIdBuffer.toTensor();
}

const protoClassId = getProtoClassIdx({
    prototypeShape: [200, 1, 1, 128],
    numClasses: 20
});

const ppLoss = protoPartLoss(
    {
        prototypeShape: [200, 1, 1, 128]
    },
    protoClassId
);

function logitLoss(yTrue: tf.Tensor, yPred: tf.Tensor): tf.Tensor {
  const loss = tf.losses.softmaxCrossEntropy(yTrue, yPred);
  return loss;
}

export const ppNet: TaskProvider = {
  getTask (): Task {
    return {
      taskID: 'ppnet',
      displayInformation: {
        taskTitle: 'Prototypical Part Network',
        summary: {
          preview: 'Using prototypical parts for image classification',
          overview: 'Interpreting prototypical parts to leverage explainability in deep learning models.'
        },
        limitations: 'This is the simplified version of the fully functional Prototypical Part Network in Python',
        tradeoffs: 'Model simplification vs. performance',
        dataFormatInformation: 'A subset of birds classification dataset',
      },
      trainingInformation: {
        modelID: 'ppnet',
        epochs: 5,
        // modelURL: 'https://storage.googleapis.com/deai-313515.appspot.com/models/mobileNetV2_35_alpha_2_classes/model.json',
        roundDuration: 1,
        validationSplit: 0.2,
        batchSize: 10,
        preprocessingFunctions: [data.ImagePreprocessing.Resize, data.ImagePreprocessing.NormalizeTF],
        modelCompileData: {
          optimizer: 'adam',
          loss: 'categoricalCrossentropy',
          // loss: ['categoricalCrossentropy', ppLoss], -> multiple and custom losses, does not work
          metrics: ['accuracy']
        },
        dataType: 'image',
        IMAGE_H: 224,
        IMAGE_W: 224,
        LABEL_LIST: [
            'Black Footed Albatross', 
            'Laysan Albatross', 
            'Sooty Albatross', 
            'Groove Billed Ani', 
            'Crested Auklet', 
            'Least Auklet',
            'Parakeet Auklet',
            'Rhinocerus Auklet',
            'Brewe Blackbird',
            'Red Wing Blackbird',
            'Rusty Blackbird',
            'Yellow Headed Blackbird',
            'Bobolink',
            'Indigo Bunting',
            'Lazuli Bunting',
            'Painted Bunting',
            'Cardinal',
            'Spotted Catbird',
            'Gray Catbird',
            'Yellow Breasted Chat'
        ],
        scheme: 'Federated', // secure aggregation not yet implemented for federated
        noiseScale: undefined,
        clippingRadius: undefined
      }
    }
  },

  async getModel (): Promise<tf.LayersModel> {
    const config: any = {
        imgSize: 224,
        prototypeShape: [200, 1, 1, 128],
        prototypeActivationFunction: 'log',
        featureShape: [7, 7, 2048],
        pretrainedPath: './models/resnet50v2/model.json',
        numClasses: 20
    }

    const featureLayers = await convFeatures(config);

    const inputs = tf.input({ shape: [config.imgSize, config.imgSize, 3] });
    const cnnFeatures = featureLayers.apply(inputs);
    const distances = L2Convolution(config).apply(cnnFeatures);

    const minDistances = MinDistancesPooling(config).apply(distances) as tf.SymbolicTensor;

    const prototype_activations = Distance2Similarity(config).apply(minDistances);

    const logits = tf.layers.dense({
        name: 'logits',
        units: config.numClasses
    }).apply(prototype_activations) as tf.SymbolicTensor;

    const model = tf.model({ inputs: inputs, outputs: logits});
    // multiple outputs arch -> does not work
    // const model = tf.model({ inputs: inputs, outputs: [logits, minDistances]})
    return model;
  }
}