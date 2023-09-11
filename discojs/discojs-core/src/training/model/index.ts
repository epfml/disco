import { TFJSModel } from './tfjs_model'
import { GPTModel } from './gpt_model'

export { Model as ModelBase } from './model'
export { TFJSModel } from './tfjs_model'
export { GPTModel } from './gpt_model'
export type Model = TFJSModel | GPTModel
