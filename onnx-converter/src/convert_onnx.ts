import { onnx } from "./protobuf/onnx-proto.js";
import { Map, Range } from "immutable";
import fsPromise from "node:fs/promises";
import * as tf from "@tensorflow/tfjs-node";

import { models, serialization } from "@epfml/discojs";

const OUTPUT_FILENAME = "model.json";
const GPT2_N_LAYER = 12;
const GPT2_CONTEXT_LENGTH = 1024;
const ONNX_URL =
  "https://huggingface.co/Xenova/gpt2/resolve/main/onnx/decoder_model.onnx?download=true";

async function main() {
  console.log(`Downloading ONNX model from ${ONNX_URL}...`);
  const response = await fetch(ONNX_URL);
  if (!response.ok)
    throw new Error(
      `Failed to fetch ONNX model from ${ONNX_URL}: ${response.statusText}`,
    );
  const arrayBuffer = await response.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  console.log(
    `Download complete (${(data.length / 1024 / 1024).toFixed(2)} MB).`,
  );
  console.log(`Decoding protobuf...`);

  const onnxModel = onnx.ModelProto.decode(data);

  if (!onnxModel.graph || !onnxModel.graph.initializer)
    throw new Error("No graph or tensors found in the ONNX model.");
  console.log("ONNX model loaded successfully");

  // Init empty TF.js model
  const gptModel = new models.GPT({
    modelType: "gpt2",
    contextLength: GPT2_CONTEXT_LENGTH,
  });
  if (gptModel.config.nLayer != GPT2_N_LAYER)
    throw new Error(
      `ONNX conversion only supports GPT-2 with 12 layers, instead found ${gptModel.config.nLayer}.`,
    );
  const gptLayersModel = gptModel.extract();

  console.log("Converting ONNX tensors to TF.js tensors");
  // Layer name mapping between ONNX and TF.js
  const onnxTfjsMapping = createWeightNameMap();
  // Create a mapping between layer name and TF.js weight tensors
  let preTrainedWeights = Map<string, tf.Tensor>(); // layer name to weight tensor
  for (const tensor of onnxModel.graph.initializer) {
    if (tensor.name === undefined || tensor.name === null)
      throw new Error("Undefined layer named");

    const tfjsName = onnxTfjsMapping.get(tensor.name);
    if (tfjsName === undefined)
      throw new Error(`Missing ONNX weight in layer mapping: ${tensor.name}`);
    if (preTrainedWeights.get(tfjsName))
      throw new Error(`Duplicate weight name found: ${tfjsName}`);

    if (tensor.dims === undefined || tensor.dims === null)
      throw new Error(`Undefined layer dimensions for ${tensor.name}`);
    const dims = tensor.dims.map((d) => Number(d));
    const flatData = parseTensorData(tensor);
    let tfTensor = tf.tensor(flatData).reshape(dims);
    if (tensor.name === "transformer.wpe.weight") {
      if (dims.length !== 2)
        throw new Error(
          `Expected transformer.wpe.weight to be a 2D tensor, got ${dims.length}D.`,
        );
      if (dims[0] < GPT2_CONTEXT_LENGTH)
        throw new Error(
          `ONNX positional embeddings only support context length ${dims[0]}, requested ${GPT2_CONTEXT_LENGTH}.`,
        );
      tfTensor = tfTensor.slice([0, 0], [GPT2_CONTEXT_LENGTH, dims[1]]);
    }
    preTrainedWeights = preTrainedWeights.set(tfjsName, tfTensor);
  }

  console.log("Initializing a new TFJS GPT-2 model...");
  if (preTrainedWeights.size !== onnxTfjsMapping.size)
    throw new Error(
      `Expected to load ${onnxTfjsMapping.size} weights, but loaded ${preTrainedWeights.size}.`,
    );

  // Overwrite the GPT-TF.js model weights with the ONNX weights
  if (gptLayersModel.weights.length !== onnxTfjsMapping.size)
    throw new Error(`Mismatch between TFJS and ONNX weight mapping weights.`);

  const finalWeights = gptLayersModel.weights.map((weight) => {
    const newTensor = preTrainedWeights.get(weight.name);
    if (newTensor === undefined)
      throw new Error(`Missing ${weight.name} in the ONNX weights`);
    return newTensor;
  });

  gptLayersModel.setWeights(finalWeights); // shape or transpose mismatch will throw here

  const encoded = await serialization.model.encode(gptModel);
  await fsPromise.writeFile(OUTPUT_FILENAME, encoded);
  console.log(`GPT-TFJS model saved to ${OUTPUT_FILENAME}`);
}

/**
 * Converts protobuf's tensors to float 32 arrays.
 */
function parseTensorData(tensor: onnx.ITensorProto): Float32Array {
  // Check for raw data (common in larger models)
  if (tensor.rawData && tensor.rawData.length > 0) {
    const buffer = tensor.rawData.buffer.slice(
      tensor.rawData.byteOffset,
      tensor.rawData.byteOffset + tensor.rawData.byteLength,
    );
    if (tensor.dataType != onnx.TensorProto.DataType.FLOAT) {
      throw new Error(
        "found protobuf data type different from expected float 32.",
      );
    }
    return new Float32Array(buffer);
  }

  throw new Error(
    "Protobuf's `rawData` is empty. Potentially check `floatData`.",
  );
}

/**
 * Maps ONNX weight names to TFJS weight names.
 * This mapping is specific to GPT-2 137M with 12 layers.
 * @param prefix the TFJS model name specified in its GPTConfig, default is 'transformer'
 */
function createWeightNameMap(): Map<string, string> {
  let map = Map<string, string>();

  map = map.set(`transformer.wte.weight`, `transformer/wte/embedding`);
  map = map.set(`transformer.wpe.weight`, `transformer/wpe/embeddings`);

  Range(0, GPT2_N_LAYER).forEach((i) => {
    const onnxPrefix = `transformer.h.${i}`;
    const tfjsPrefix = `transformer/h${i}`;
    map = map.set(`${onnxPrefix}.ln_1.weight`, `${tfjsPrefix}/ln_1/gamma`);
    map = map.set(`${onnxPrefix}.ln_1.bias`, `${tfjsPrefix}/ln_1/beta`);
    map = map.set(
      `${onnxPrefix}.attn.c_attn.weight`,
      `${tfjsPrefix}/attn/c_attn/kernel`,
    );
    map = map.set(
      `${onnxPrefix}.attn.c_attn.bias`,
      `${tfjsPrefix}/attn/c_attn/bias`,
    );
    map = map.set(
      `${onnxPrefix}.attn.c_proj.weight`,
      `${tfjsPrefix}/attn/c_proj/kernel`,
    );
    map = map.set(
      `${onnxPrefix}.attn.c_proj.bias`,
      `${tfjsPrefix}/attn/c_proj/bias`,
    );
    map = map.set(`${onnxPrefix}.ln_2.weight`, `${tfjsPrefix}/ln_2/gamma`);
    map = map.set(`${onnxPrefix}.ln_2.bias`, `${tfjsPrefix}/ln_2/beta`);
    map = map.set(
      `${onnxPrefix}.mlp.c_fc.weight`,
      `${tfjsPrefix}/mlp/c_fc/kernel`,
    );
    map = map.set(`${onnxPrefix}.mlp.c_fc.bias`, `${tfjsPrefix}/mlp/c_fc/bias`);
    map = map.set(
      `${onnxPrefix}.mlp.c_proj.weight`,
      `${tfjsPrefix}/mlp/c_proj/kernel`,
    );
    map = map.set(
      `${onnxPrefix}.mlp.c_proj.bias`,
      `${tfjsPrefix}/mlp/c_proj/bias`,
    );
  });

  map = map.set(`transformer.ln_f.weight`, `transformer/ln_f/gamma`);
  map = map.set(`transformer.ln_f.bias`, `transformer/ln_f/beta`);
  return map;
}

await main().catch(console.error);
