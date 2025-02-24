import type { DataType, Network, Task } from "../index.js";
import { client as clients, type aggregator } from '../index.js'

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 15_000

export async function timeout (ms = MAX_WAIT_PER_ROUND, errorMsg: string = 'timeout'): Promise<never> {
  return await new Promise((_, reject) => {
    setTimeout(() => { reject(new Error(errorMsg)) }, ms)
  })
}

export function getClient<D extends DataType, N extends Network>(
	scheme: N | "local",
	serverURL: URL,
	task: Task<D, N>,
	aggregator: aggregator.Aggregator,
): clients.Client<N> {
	switch (scheme) {
		case "decentralized": {
			const t = task as Task<D, "decentralized">;
			t.trainingInformation.scheme = scheme;

			return new clients.decentralized.DecentralizedClient(
				serverURL,
				t,
				aggregator,
			);
		}
		case "federated": {
			const t = task as Task<D, "federated">;
			t.trainingInformation.scheme = scheme;

			return new clients.federated.FederatedClient(serverURL, t, aggregator);
		}
		case "local": {
			const t = task as Task<D, "local">;
			t.trainingInformation.scheme = scheme;

			return new clients.LocalClient(serverURL, t, aggregator);
		}
		default: {
			const _: never = scheme;
			throw new Error("should never happen");
		}
	}
}
