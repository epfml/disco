import type { DataType, Model, Network, Task } from "../index.js";

export interface TaskProvider<D extends DataType, N extends Network> {
	getTask(): Promise<Task<D, N>>;
	// Create the corresponding model ready for training (compiled)
	getModel(): Promise<Model<D>>;
}
