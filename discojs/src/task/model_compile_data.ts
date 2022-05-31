export class ModelCompileData {
  constructor (
    public readonly optimizer: string,
    public readonly loss: string,
    public readonly metrics: string[]
  ) {}
}
