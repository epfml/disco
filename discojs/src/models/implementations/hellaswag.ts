import * as tf from "@tensorflow/tfjs";
import { List } from "immutable";
import type { Tokenizer } from "../index.js";
import { GPT } from "../index.js";
import type { ONNXModel } from "../onnx.js";

export const HELLASWAG_URL =
  "https://raw.githubusercontent.com/rowanz/hellaswag/master/data/hellaswag_val.jsonl";

/**
 * Represents a single example from the HellaSwag dataset.
 *
 * ctx - The context sentence or paragraph that sets up the situation.
 * endings - An array of four possible continuations of the context.
 * label - The index (0–3) of the correct ending in the `endings` array.
 */
export interface HellaSwagExample {
  ctx: string;
  endings: string[];
  label: number;
}

export type HellaSwagDataset = HellaSwagExample[];

// Computes the log likelihood of the input sequence using the tfjs model
// The input sequence is expected to be a concatenation of the context and the ending
// The function computes the log likelihood of each ending and returns the one with the loss of each ending
// Sources:
// https://github.com/karpathy/build-nanogpt/blob/master/hellaswag.py
//https://www.youtube.com/watch?v=l8pRSuU81PU
async function computeLogLikelihood(
  gpt: GPT,
  inputIds: number[],
  ctxLength: number,
): Promise<number> {
  const lossTensor = tf.tidy(() => {
    // Convert input sequence to shape [1, seq_len]
    const inputTensor = tf.tensor2d([inputIds], [1, inputIds.length], "int32");

    // Get model logits: [1, seq_len, vocab_size]
    const logits3D = gpt.extract().predict(inputTensor) as tf.Tensor3D;

    // Shift logits to align with next-token targets
    const shiftedLogits = logits3D.slice(
      [0, 0, 0],
      [1, inputIds.length - 1, -1],
    );

    // Target tokens (next tokens), same length as shifted logits
    const shiftedTargets = inputIds.slice(1);
    const targetTensor = tf.tensor1d(shiftedTargets, "int32");

    // One-hot encode targets for cross-entropy loss
    const oneHotLabels = tf.oneHot(targetTensor, shiftedLogits.shape[2]);

    // Compute per-token cross-entropy log-probabilities (unnormalized loss)
    const logProbs = tf.losses.softmaxCrossEntropy(
      oneHotLabels,
      shiftedLogits.squeeze(),
    );

    // Create a mask to only include loss after the context length
    const mask = tf
      .tensor1d(
        inputIds.map((_, i) => (i >= ctxLength ? 1 : 0)),
        "float32",
      )
      .slice(1);

    // Apply the mask and average over the selected tokens
    const masked = logProbs.mul(mask);
    const loss = masked.sum().div(mask.sum());

    return loss;
  });
  const lossNumber = await lossTensor.array();
  if (typeof lossNumber !== "number") {
    throw new Error("got multiple loss");
  }
  return lossNumber;
}

// Computes the log likelihood of the input sequence using the ONNX model
// The input sequence is expected to be a concatenation of the context and the ending
// The function computes the log likelihood of each ending and returns the one with the loss of each ending
// Sources:
// https://github.com/karpathy/build-nanogpt/blob/master/hellaswag.py
// https://www.youtube.com/watch?v=l8pRSuU81PU
async function computeONNXLogLikelihood(
  model: ONNXModel,
  inputIds: number[],
  ctxLength: number,
): Promise<number> {
  const batchInput = List([List(inputIds)]); // [1, seq_len]

  // Run model to get logits: flattened [T * V]
  const logitsTensor = await model.getLogits(batchInput);
  const logits = logitsTensor.data as number[];
  const [_B, T, V] = logitsTensor.dims;

  // Reshape flattened logits into [T][V]
  const reshaped: number[][] = Array.from({ length: T }, (_, t) =>
    logits.slice(t * V, (t + 1) * V),
  );

  // Shift targets (next-token prediction)
  const targets = inputIds.slice(1); // length = T - 1
  const logitsShifted = reshaped.slice(0, T - 1); // also length = T - 1

  // Compute per-token cross-entropy loss manually
  const losses = logitsShifted.map((logit, i) => {
    const maxLogit = Math.max(...logit); // for numerical stability
    const exp = logit.map((x) => Math.exp(x - maxLogit));
    const sumExp = exp.reduce((a, b) => a + b, 0);
    const probs = exp.map((e) => e / sumExp); // softmax
    return -Math.log(probs[targets[i]]); // cross-entropy loss
  });

  // Create a binary mask for non-context tokens
  const mask = inputIds.map((_, i) => (i >= ctxLength ? 1 : 0)).slice(1);

  // Apply the mask to the losses
  const maskedLosses = losses.map((l, i) => l * mask[i]);

  // Average the masked losses
  const totalLoss = maskedLosses.reduce((a, b) => a + b, 0);
  const sum = mask.reduce((a, b) => a + b, 0 as number);

  return totalLoss / (sum || 1); // avoid division by 0
}

type ModelType = GPT | ONNXModel;

/**
 * Evaluates the model on a given HellaSwag dataset.
 *
 * @param model - The model to evaluate (GPT or ONNXModel)
 * @param tokenizer - The tokenizer to use
 * @param dataset - An array of HellaSwagExample to evaluate on
 * @param limit - Number of examples to evaluate (default: all)
 * @param print - Whether to print results (default: true)
 * @returns The accuracy of the model on the dataset
 */
export async function evaluate(
  model: ModelType,
  tokenizer: Tokenizer,
  dataset: HellaSwagDataset,
  print = true,
): Promise<number> {
  let correct = 0;
  let total = 0;

  for (const example of dataset) {
    const endingTokens = example.endings.map((e) =>
      tokenizer
        .tokenize(`${example.ctx} ${e}`, {
          truncation: true,
          max_length: 128,
        })
        .toArray(),
    );

    const ctxTokens = tokenizer
      .tokenize(example.ctx, {
        truncation: true,
        max_length: 128,
      })
      .toArray();

    let losses: number[] = [];

    if (model instanceof GPT) {
      losses = await Promise.all(
        endingTokens.map((e) =>
          computeLogLikelihood(model, e, ctxTokens.length),
        ),
      );
    } else {
      losses = await Promise.all(
        endingTokens.map((e) =>
          computeONNXLogLikelihood(model, e, ctxTokens.length),
        ),
      );
    }

    const pred = losses.indexOf(Math.min(...losses));
    if (pred === example.label) correct++;
    total++;

    if (print) {
      console.log(`\nExample #${total}`);
      console.log(`Context: ${example.ctx}`);
      example.endings.forEach((end, i) => {
        console.log(
          `  ${i}: ${end}  (loss: ${losses[i].toFixed(4)})${i === example.label ? " <-- correct" : ""}${i === pred ? " <-- picked" : ""}`,
        );
      });
      const accuracy_temp = correct / total;
      console.log(
        `\n Accuracy on ${total} examples: ${(accuracy_temp * 100).toFixed(2)}%`,
      );
    }
  }

  const accuracy = correct / total;
  console.log(
    `\nFinal accuracy on ${total} examples: ${(accuracy * 100).toFixed(2)}%`,
  );
  return accuracy;
}
