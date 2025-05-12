import { AutoModelForCausalLM, PreTrainedModel, Tensor } from '@xenova/transformers';
import { Model } from './index.js';
import type {
  WeightsContainer
} from '../index.js';
import { List } from 'immutable';
import type { CausalLMOutput, DataArray } from '@xenova/transformers';


export class ONNXModel extends Model<'text'> {
  private model: PreTrainedModel;

  private constructor(model: PreTrainedModel) {
    super();
    this.model = model;
  }

  static async init_pretrained(modelName = 'Xenova/gpt2'): Promise<ONNXModel> {
    const model = await AutoModelForCausalLM.from_pretrained(modelName);
    return new ONNXModel(model);
  }

  getConfig(): Record<string, unknown> {
    return this.model.config as Record<string, unknown>;
  }


  async predict(batch: List<List<number>>): Promise<List<number>> {
    const input_ids_array: number[][] = batch.toArray().map(seq => seq.toArray());
  
    // Pad all sequences to same length
    const maxLen = Math.max(...input_ids_array.map(seq => seq.length));
    const padded_input_ids = input_ids_array.map(seq =>
      seq.concat(Array(maxLen - seq.length).fill(0)) // pad with 0s
    );
    const input_shape = [padded_input_ids.length, maxLen];
  
    // Create BigInt versions for int64
    const input_ids_flat = padded_input_ids.flat().map(x => BigInt(x));
    const input_ids = new Tensor('int64', input_ids_flat, input_shape);
  
    const attention_mask_array: number[][] = input_ids_array.map(
      (seq): number[] => new Array<number>(seq.length).fill(1)
    );    
    const attention_mask_flat = attention_mask_array.flat().map(x => BigInt(x));
    const attention_mask = new Tensor('int64', attention_mask_flat, input_shape);
  
    // run model forward
    const outputs = await this.model.forward({ input_ids, attention_mask }) as CausalLMOutput;
  
    // get logits and return predictions
    const logitsTensor = outputs.logits;
    const logitsData: DataArray = logitsTensor.data; // note parentheses
    const [batchSize, seqLen, vocabSize] = logitsTensor.dims;
    
    // reshape to [batch][seq][vocab]
    const logits: number[][][] = [];
    for (let b = 0; b < batchSize; b++) {
      const seq: number[][] = [];
      for (let t = 0; t < seqLen; t++) {
        const start = b * seqLen * vocabSize + t * vocabSize;
        const end = start + vocabSize;
        const tokenLogits = Array.from(logitsData.slice(start, end)) as number[];
        seq.push(tokenLogits);        
      }
      logits.push(seq);
    }

    const predictions: number[] = logits.map(sequence => {
      const lastLogits = sequence[sequence.length - 1];
      return lastLogits.indexOf(Math.max(...lastLogits));
    });
    
    return List(predictions);
  }

  async getLogits(batch: List<List<number>>): Promise<Tensor> {
    const input_ids_array: number[][] = batch.toArray().map(seq => seq.toArray());
    const attention_mask_array: number[][] = input_ids_array.map(
      (seq): number[] => new Array<number>(seq.length).fill(1)
    );
      
    const input_ids_flat = input_ids_array.flat();
    const attention_mask_flat = attention_mask_array.flat();
    const shape = [input_ids_array.length, input_ids_array[0].length];
  
    // use BigInt for int64 compatibility
    const input_ids = new Tensor('int64', input_ids_flat.map(BigInt), shape);
    const attention_mask = new Tensor('int64', attention_mask_flat.map(BigInt), shape);

    // run model forward
    const outputs = await this.model.forward({ input_ids, attention_mask }) as CausalLMOutput;
    return outputs.logits;
  }

  async *train(): AsyncGenerator<never, never> {
    await Promise.resolve(); // dummy await
    const yieldFlag = false;
    if (yieldFlag) yield undefined as never; // satisfy 'require-yield'
    throw new Error('Training not supported for ONNX models');
  }

  get weights(): WeightsContainer {
    throw new Error('Weights access not supported in ONNX models');
  }

  set weights(_: WeightsContainer) {
    throw new Error('Weights setting not supported in ONNX models');
  }

  [Symbol.dispose](): void {
    // Dispose of the model to free up memory
    void this.model.dispose();}
}
