import type { Task } from '../index.js'
import { AutoTokenizer, PreTrainedTokenizer, env } from '@xenova/transformers';

/**
 * A task's tokenizer is initially specified as the tokenizer name, e.g., 'Xenova/gpt2'.
 * The first time the tokenizer is needed, this function initializes the actual tokenizer object 
 * and saves it in the task' tokenizer field to be reused in subsequent calls.
 * 
 * We are proceeding as such because the task object is sent from the server to the client. Rather than
 * sending complex objects through the network, we simply send the tokenizer name, which is then initialized client-side the 
 * first time it is called.
 * @param task the task object specifying which tokenizer to use
 * @returns an initialized tokenizer object
 */
export async function getTaskTokenizer(task: Task): Promise<PreTrainedTokenizer> {
  let tokenizer = task.trainingInformation.tokenizer
  if (tokenizer === undefined) throw Error('No tokenizer specified in the task training information')
  if (typeof tokenizer == 'string') {

    // Needs to be false in order to prevent transformers.js from reading the local cache 
    // and triggering an error when running in the browser
    // Reference: https://medium.com/@GenerationAI/transformers-js-onnx-runtime-webgpu-46c3e58d547c
    env.allowLocalModels = false
    tokenizer = await AutoTokenizer.from_pretrained(tokenizer)
    task.trainingInformation.tokenizer = tokenizer
  }
  return tokenizer
}

function isArrayOfNumber(raw: unknown): raw is number[] {
  return Array.isArray(raw) && raw.every((e) => typeof e === "number");
}

interface TokenizingConfig {
  padding?: boolean,
  truncation?: boolean,
  return_tensor?: boolean
  text_pair?: string | null,
  add_special_tokens?: boolean,
  max_length?: number,
  return_token_type_ids?: boolean,
}

/**
 * Wrapper around Transformers.js tokenizer to handle type checking and format the output.
 * 
 * @param tokenizer the tokenizer object
 * @param text the text to tokenize
 * @param config TokenizingConfig, the tokenizing parameters when using `tokenizer` 
 * @returns number[] the tokenized text
 */
export function tokenize(tokenizer: PreTrainedTokenizer, text: string, config: TokenizingConfig): number[] {
  const tokenizerResult: unknown = tokenizer(text, config);

  if (
    typeof tokenizerResult !== "object" ||
    tokenizerResult === null ||
    !("input_ids" in tokenizerResult) ||
    !isArrayOfNumber(tokenizerResult.input_ids)
  )
    throw new Error("tokenizer returned unexpected type");
    
  return tokenizerResult.input_ids
}