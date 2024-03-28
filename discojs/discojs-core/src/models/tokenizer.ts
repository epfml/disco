import type { Task } from '../index.js'
import { AutoTokenizer, PreTrainedTokenizer } from '@xenova/transformers';

/**
 * A task's tokenizer is initially specified as the tokenizer name, e.g., 'Xenova/gpt2'.
 * The first time the tokenizer is needed, this function initializes the actual tokenizer object 
 * and saves it in the task' tokenizer field to be reused in subsequent calls.
 * 
 * We are proceeding this way because the task object is sent from the server to the client. Rather than
 * sending complex objects through the network, we simply send the tokenizer name to be initialized client-side the 
 * first time it is called.
 * @param task the task object specifying which tokenizer to use
 * @returns an initialized tokenizer object
 */
export async function getTaskTokenizer(task: Task): Promise<PreTrainedTokenizer> {
  let tokenizer = task.trainingInformation.tokenizer
  if (tokenizer === undefined) throw Error('No tokenizer specified in the task training information')
  if (typeof tokenizer == 'string') {
    tokenizer = await AutoTokenizer.from_pretrained(tokenizer)
    task.trainingInformation.tokenizer = tokenizer
  }
  return tokenizer
}