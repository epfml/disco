import fs from 'fs';
import { promises as fsPromises } from 'fs';
import fetch from 'node-fetch';
import * as tf from '@tensorflow/tfjs';
import { GPT } from './gpt/index.js';
import { tokenize } from '../processing/text.js';
import { PreTrainedTokenizer } from '@xenova/transformers';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';
import { List } from 'immutable';
import { ONNXModel } from './onnx.js';


const HELLASWAG_URL = 'https://raw.githubusercontent.com/rowanz/hellaswag/master/data/hellaswag_val.jsonl';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_FILE = path.resolve(__dirname, '../../../../datasets/hellaswag_val.jsonl');

async function fileExists(path: string): Promise<boolean> {
  try {
    await fsPromises.access(path);
    return true;
  } catch {
    return false;
  }
}

export async function downloadHellaSwag(): Promise<void> {
  if (await fileExists(LOCAL_FILE)) return;

  const res = await fetch(HELLASWAG_URL);
  const fileStream = fs.createWriteStream(LOCAL_FILE);

  await new Promise<void>((resolve, reject) => {
    res.body?.pipe(fileStream);
    res.body?.on('error', reject);
    fileStream.on('error', reject);
    fileStream.on('finish', () => resolve());
  });
}

interface HellaSwagExample {
  ctx: string;
  endings: string[];
  label: number;
}

export async function* loadExamples(limit = 100): AsyncGenerator<HellaSwagExample> {
  const fileStream = fs.createReadStream(LOCAL_FILE, 'utf-8');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let count = 0;
  for await (const line of rl) {
    if (count++ >= limit) break;
    try {
      const data = JSON.parse(line.trim()) as HellaSwagExample;
      yield { ctx: data.ctx, endings: data.endings, label: data.label };
    } catch (e) {
      console.error(`Failed to parse line ${count}:`, line);
      throw e;
    }
  }
}

async function computeLogLikelihood(gpt: GPT, inputIds: number[], ctxLength: number): Promise<number> {
  const lossTensor =  tf.tidy(() => {
    const inputTensor = tf.tensor2d([inputIds], [1, inputIds.length], 'int32');
    const logits3D = gpt.extract().predict(inputTensor) as tf.Tensor3D; // [1, seq_len, vocab_size]
    const shiftedLogits = logits3D.slice([0, 0, 0], [1, inputIds.length - 1, -1]);
    const shiftedTargets = inputIds.slice(1);
    const targetTensor = tf.tensor1d(shiftedTargets, 'int32');
    const oneHotLabels = tf.oneHot(targetTensor, shiftedLogits.shape[2]); // [seq_len, vocab_size]
    const logProbs = tf.losses.softmaxCrossEntropy(oneHotLabels, shiftedLogits.squeeze());    
    const mask = tf.tensor1d(inputIds.map((_, i) => (i >= ctxLength ? 1 : 0)), 'float32').slice(1);
    const masked = logProbs.mul(mask);
    const loss = masked.sum().div(mask.sum());
    return loss;
  });
  const lossNumber = await lossTensor.array();
  if (typeof lossNumber !== 'number') {
    throw new Error('got multiple loss')
  }
  return lossNumber;
}

async function computeONNXLogLikelihood(model: ONNXModel, inputIds: number[], ctxLength: number): Promise<number> {
  const batchInput = List([List(inputIds)]); // [1, seq_len]

  const logitsTensor = await model.getLogits(batchInput);
  const logits = logitsTensor.data as number[]; // flattened
  const [_B, T, V] = logitsTensor.dims;

  const reshaped: number[][] = Array.from({ length: T }, (_, t) =>
    logits.slice(t * V, (t + 1) * V)
  );

  const targets = inputIds.slice(1);
  const logitsShifted = reshaped.slice(0, T - 1);

  const losses = logitsShifted.map((logit, i) => {
    const maxLogit = Math.max(...logit);
    const exp = logit.map(x => Math.exp(x - maxLogit));
    const sumExp = exp.reduce((a, b) => a + b, 0);
    const probs = exp.map(e => e / sumExp);
    return -Math.log(probs[targets[i]]);
  });

  const mask = inputIds.map((_, i) => (i >= ctxLength ? 1 : 0)).slice(1);
  const maskedLosses = losses.map((l, i) => l * mask[i]);

  const totalLoss = maskedLosses.reduce((a, b) => a + b, 0);
  const sum = mask.reduce((a, b) => a + b, 0 as number);

  return totalLoss / (sum || 1);
}


type Tokenizer = PreTrainedTokenizer;
type ModelType = GPT | ONNXModel;

export async function evaluate(
  model: ModelType,
  tokenizer: Tokenizer,
  limit = 50
): Promise<number> {
  await downloadHellaSwag();

  let correct = 0;
  let total = 0;

  for await (const example of loadExamples(limit)) {
    const ctxTokens = tokenize(tokenizer, example.ctx).toArray();
    const endingTokens = example.endings.map(e =>
      tokenize(tokenizer, ' ' + e).toArray()
    );

    let losses: number[] = [];

    if (model instanceof GPT) {
      losses = await Promise.all(
        endingTokens.map(e =>
          computeLogLikelihood(model, ctxTokens.concat(e), ctxTokens.length)
        )
      );
    } else {
      // Assuming model is ONNXModel
      // Use computeONNXLogLikelihood for ONNXModel
      losses = await Promise.all(
        endingTokens.map(e =>
          computeONNXLogLikelihood(model, ctxTokens.concat(e), ctxTokens.length)
        )
      );
      
    }

    const pred = losses.indexOf(Math.min(...losses));
    if (pred === example.label) correct++;
    total++;

    if (total < 5) {
      console.log(`\nExample #${total}`);
      console.log(`Context: ${example.ctx}`);
      example.endings.forEach((end, i) => {
        console.log(
          `  ${i}: ${end}  (loss: ${losses[i].toFixed(4)})${i === example.label ? ' <-- correct' : ''}${i === pred ? ' <-- picked' : ''}`
        );
      });
      const accuracy_temp = correct / total;
      console.log(`\n Accuracy on ${total} examples: ${(accuracy_temp * 100).toFixed(2)}%`);
    }
  }

  const accuracy = correct / total;
  console.log(`\nFinal accuracy on ${total} examples: ${(accuracy * 100).toFixed(2)}%`);
  return accuracy;
}