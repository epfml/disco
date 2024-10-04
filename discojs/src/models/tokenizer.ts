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
export async function getTaskTokenizer(task: Task<'text'>): Promise<PreTrainedTokenizer> {
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
