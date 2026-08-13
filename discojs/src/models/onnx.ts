import type { CausalLMOutput } from "@xenova/transformers";
import {
  AutoModelForCausalLM,
  PreTrainedModel,
  Tensor,
} from "@xenova/transformers";
import { List } from "immutable";

import type { WeightsContainer } from "#weights/index";
import type { Batched } from "#dataset/index";
import type { DataFormat } from "#dtypes/index";
import type { GenerationConfig as TFJSGenerationConfig } from "./implementations/gpt/config.js";
import { Model } from "#models/model";
import { DefaultGenerationConfig } from "./implementations/gpt/config.js";

export class ONNXModel extends Model<"text"> {
  readonly datatype = "text" as const;

  private model: PreTrainedModel;

  private constructor(model: PreTrainedModel) {
    super();
    this.model = model;
  }

  static async init_pretrained(modelName = "Xenova/gpt2"): Promise<ONNXModel> {
    const model = await AutoModelForCausalLM.from_pretrained(modelName);
    return new ONNXModel(model);
  }

  getConfig(): Record<string, unknown> {
    return this.model.config as Record<string, unknown>;
  }

  override async predict(
    batch: Batched<DataFormat.ModelEncoded["text"][0]>,
    options?: Partial<TFJSGenerationConfig>,
  ): Promise<Batched<DataFormat.ModelEncoded["text"][1]>> {
    const config = Object.assign({}, DefaultGenerationConfig, options);

    return List(
      await Promise.all(
        batch.map((tokens) => this.#predictSingle(tokens, config)),
      ),
    );
  }

  async #predictSingle(
    tokens: DataFormat.ModelEncoded["text"][0],
    config: TFJSGenerationConfig,
  ): Promise<DataFormat.ModelEncoded["text"][1]> {
    const contextLength =
      (this.model.config as { max_position_embeddings?: number })
        .max_position_embeddings ?? 1024;
    const truncated = tokens.slice(-contextLength).toArray();

    if (truncated.length === 0) {
      throw new Error("Token list is empty. Cannot run generate().");
    }

    const input_ids = new Tensor("int64", truncated.map(BigInt), [
      1,
      truncated.length,
    ]);

    const output = (await this.model.generate(input_ids, {
      max_new_tokens: 1,
      temperature: config.temperature,
      do_sample: config.doSample,
      top_k: config.topk,
    })) as number[][];

    if (
      !Array.isArray(output) ||
      output.length === 0 ||
      !Array.isArray(output[0])
    ) {
      throw new Error("ONNX model.generate() did not return valid sequences.");
    }

    const predicted_id = output[0].at(-1) as number;
    return Number(predicted_id);
  }

  async getLogits(batch: List<List<number>>): Promise<Tensor> {
    const input_ids_array: number[][] = batch
      .toArray()
      .map((seq) => seq.toArray());
    const attention_mask_array: number[][] = input_ids_array.map(
      (seq): number[] => new Array<number>(seq.length).fill(1),
    );

    const input_ids_flat = input_ids_array.flat();
    const attention_mask_flat = attention_mask_array.flat();
    const shape = [input_ids_array.length, input_ids_array[0].length];

    // use BigInt for int64 compatibility
    const input_ids = new Tensor("int64", input_ids_flat.map(BigInt), shape);
    const attention_mask = new Tensor(
      "int64",
      attention_mask_flat.map(BigInt),
      shape,
    );

    // run model forward
    const outputs = (await this.model.forward({
      input_ids,
      attention_mask,
    })) as CausalLMOutput;
    return outputs.logits;
  }

  async *train(): AsyncGenerator<never, never> {
    await Promise.resolve(); // dummy await
    const yieldFlag = false;
    if (yieldFlag) yield undefined as never; // satisfy 'require-yield'
    throw new Error("Training not supported for ONNX models");
  }

  evaluate(): Promise<never> {
    throw new Error("Evaluation not supported for ONNX models");
  }

  get weights(): WeightsContainer {
    throw new Error("Weights access not supported in ONNX models");
  }

  set weights(_: WeightsContainer) {
    throw new Error("Weights setting not supported in ONNX models");
  }

  [Symbol.dispose](): void {
    // Dispose of the model to free up memory
    void this.model.dispose();
  }
}
