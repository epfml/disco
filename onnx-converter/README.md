## Usage

This workspace is currently used to convert ONNX [GPT-2 model](https://huggingface.co/Xenova/gpt2) to Tensorflow.js. On the one hand, ONNX allows converting pretrained models from PyTorch or Tensorflow to the ONNX format, therefore there currently exists many pretrained models in ONNX format. However, ONNX libraries currently only support inference. On the other hand, Tensorflow.js doesn't have a converter that can handle recent Transformers models (despite having a [converter](https://github.com/tensorflow/tfjs/tree/master/tfjs-converter)), but TF.js allows further training models.

Therefore, we want to convert pretrained models such as GPT-2 from ONNX format to Tensorflow.js to further fine-tune them. You generate a TF.js `model.json` by running `npm run convert_onnx` in this workspace.

What the script does is:

1. Read the ONNX GPT-2 model from [Xenova's repository](https://huggingface.co/Xenova/gpt2)
2. Use the ONNX protobuf definition to read the file and iterate through the model layers. The ONNX JavaScript protobuf comes from [this repository](https://github.com/microsoft/onnxruntime/blob/main/js/web/lib/onnxjs/).
3. Convert all weights to TF.js tensors
4. Init a TF.js model with the loaded weights and export the model

Running `npm run convert_onnx` creates a GPT-tfjs `model.json` file in the `./assets/` folder.

## ONNX JS protobuf

The ONNX specification has limited support in JavaScript. We found an old JS implementation in the [ONNX Runtime Web repository](https://github.com/microsoft/onnxruntime/tree/main/js/web/lib/onnxjs/ort-schema/protobuf). We had to adapt their files as follows to be compatible with our newer environment:

1. Copy `onnx.js` and `onnx.d.ts` from [the repository](https://github.com/microsoft/onnxruntime/tree/main/js/web/lib/onnxjs/ort-schema/protobuf) in the `./onnx-converter/src/protobuf` folder.
2. Rename `onnx.js` to `onnx.cjs`
3. Create [`onnx-proto.js`](./src/protobuf/onnx-proto.js) as a wrapper around the protobuf definition.
4. Create [`onnx-proto.d.ts`](./src/protobuf/onnx-proto.d.ts) with the matching TypeScript definition.
