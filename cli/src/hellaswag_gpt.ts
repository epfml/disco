import fsPromise from "node:fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { parse } from "ts-command-line-args";

import "@tensorflow/tfjs-node";
import path from "node:path";
import {
  GPT,
  ONNXModel,
  modelDecode,
  Tokenizer,
  evaluate_hellaswag,
  HellaSwagDataset,
} from "@epfml/discojs";
import { loadHellaSwag } from "@epfml/discojs-node";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function evaluateModel(model: GPT | ONNXModel, numDataPoints = -1) {
  const hellaswagDataset: HellaSwagDataset = await loadHellaSwag(numDataPoints);
  const tokenizer = await Tokenizer.from_pretrained("Xenova/gpt2");
  console.log("Starting the HellaSwag benchmark...");

  const start = Date.now();
  const accuracy = await evaluate_hellaswag(
    model,
    tokenizer,
    hellaswagDataset,
    true,
  );
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`Final accuracy: ${(accuracy * 100).toFixed(2)}%`);
  console.log(`Evaluation Time: ${duration} seconds`);
}

const ModelTypes = ["onnx", "gpt-tfjs-random", "gpt-tfjs-pretrained"] as const;
type ModelType = (typeof ModelTypes)[number];

interface HellaSwagArgs {
  model: ModelType;
  numDataPoints: number;
  logFile: string;
  pretrainedModelPath: string;
  help?: boolean;
}

function castModelType(raw: string): ModelType {
  for (const t of ModelTypes) if (raw === t) return t;
  throw new Error(`Invalid model type: ${raw}`);
}

async function main(): Promise<void> {
  const args = parse<HellaSwagArgs>(
    {
      model: {
        type: (raw: string) => castModelType(raw),
        description: `Model type, one of ${ModelTypes.toString()}`,
        defaultValue: "onnx",
      },
      numDataPoints: {
        type: Number,
        description:
          "Number of HellaSwag datapoints to evaluate, set -1 for the whole benchmark",
        defaultValue: -1,
      },
      logFile: {
        type: String,
        description:
          "Relative path to the log file, default to ./hellaswag.log",
        defaultValue: "hellaswag.log",
      },
      pretrainedModelPath: {
        type: String,
        description:
          "If specifying gpt-tfjs-pretrained, provide the relative path to the TF.js pretrained model",
        defaultValue: path.join(
          __dirname,
          "..",
          "..",
          "onnx-converter",
          "assets",
          "model.json",
        ),
      },
      help: {
        type: Boolean,
        optional: true,
        alias: "h",
        description: "Prints this usage guide",
      },
    },
    { helpArg: "help" },
  );

  let model: GPT | ONNXModel | undefined;
  switch (args.model) {
    case "onnx":
      console.log("Using ONNX pretrained model Xenova/gpt2");
      model = await ONNXModel.init_pretrained("Xenova/gpt2");
      break;
    case "gpt-tfjs-random":
      console.log("Using GPT-TFJS with random initialization");
      model = new GPT({ seed: 42 });
      break;
    case "gpt-tfjs-pretrained":
      console.log("Using GPT-TFJS with pretrained weights");
      if (args.pretrainedModelPath === undefined) {
        throw new Error(
          "If choosing gpt-tfjs-pretrained, provide the relative path to the TF.js pretrained model `pretrainedModelPath",
        );
      }
      const encodedModel = await fsPromise.readFile(args.pretrainedModelPath);
      model = (await modelDecode(encodedModel)) as GPT;
      break;
  }
  await evaluateModel(model, args.numDataPoints);

  console.log("Benchmark completed!");
}

main().catch(console.error);
