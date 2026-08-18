export interface GenerationConfig {
  // take random token weighted by its probability
  // If false, predict the token with the highest probability.
  doSample: boolean;
  // the generation temperature (higher means more randomness).
  // Set to 0 for greedy decoding.
  temperature: number;
  // only consider the topk most likely tokens for sampling.
  // used if doSample is true.
  topk: number;
  // optional random seed for sampling.
  seed?: number;
}

export const DefaultGenerationConfig: GenerationConfig = {
  temperature: 1.0,
  doSample: true,
  topk: 50,
};
