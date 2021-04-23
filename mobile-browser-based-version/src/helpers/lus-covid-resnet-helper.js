import * as tf from "@tensorflow/tfjs";

// In my case I have 256x256 pictures
const IMG_SIZE = 256;
const NUMBER_OF_CHANNELS = 3;
const MAX_NUMBER_IMAGES_PER_PATIENT = 19

export default function createResnetModel(){
    return modelResNet()
}

// Batch normalisation and ReLU always go together, let's add them to the separate function
const batchNormRelu = (input) => {
    const batch = tf.layers.batchNormalization().apply(input);
    return tf.layers.reLU().apply(batch);
};

// Residual block
const residualBlock = (input, filters, noDownSample = false) => {
    const filter1 = tf.layers
        .separableConv2d({
            kernelSize: 3,
            filters,
            activation: "relu",
            padding: "same",
            strides: noDownSample ? 1 : 2,
            depthwiseInitializer: "glorotNormal",
            pointwiseInitializer: "glorotNormal",
        })
        .apply(input);
    const filter1norm = batchNormRelu(filter1);
    const filter2 = tf.layers
        .separableConv2d({
            kernelSize: 3,
            filters,
            activation: "relu",
            padding: "same",
            depthwiseInitializer: "glorotNormal",
            pointwiseInitializer: "glorotNormal",
        })
        .apply(filter1norm);
    const dropout = tf.layers.dropout({ rate: 0.3 }).apply(filter2);
    const batchNorm = batchNormRelu(dropout);
    
    // Residual connection - here we sum up first matrix and the result of 2 convolutions
    const residual = tf.layers.add().apply([filter1 , batchNorm ]);
    return residual ;
};


// ResNet - put all together
const modelResNet = () => {
    const input = tf.input({ shape: [IMG_SIZE*MAX_NUMBER_IMAGES_PER_PATIENT, IMG_SIZE, NUMBER_OF_CHANNELS] });
    const conv1_filter = tf.layers
        .conv2d({
            kernelSize: 5,
            filters: 16,
            strides: 2,
            activation: "relu",
            padding: "same",
            kernelInitializer: "glorotNormal",
        })
        .apply(input) ;
    const conv1 = tf.layers
        .maxPooling2d({
            poolSize: [3, 3],
            strides: [2, 2],
            padding: "same",
        })
        .apply(batchNormRelu(conv1_filter)) ;

    // conv 2
    const residual2 = residualBlock(conv1, 16, true);

    // conv3
    const residual3 = residualBlock(residual2, 32);

    // conv4
    const residual4 = residualBlock(residual3, 64);

    // conv5
    const residual5 = residualBlock(residual4, 128);
    const conv5 = tf.layers
        .avgPool2d({
            poolSize: [8, 8],
            strides: [1, 1],
        })
        .apply(residual5) ;

    const flatten = tf.layers.flatten().apply(conv5);
    const dropout = tf.layers.dropout({ rate: 0.5 }).apply(flatten);
    const dense = tf.layers
        .dense({
            units: 2,
            kernelInitializer: "glorotNormal",
            activation: "softmax", // softmax for categorical / relu
        })
        .apply(dropout);
    return tf.model({
        inputs: input,
        outputs: dense,
    });
};
//TODO: test only with resnet first then change output of resnet and add MLP

const deepChestModel = () => {

}