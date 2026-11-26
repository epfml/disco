import type { DataType, Network } from "#types/index";
import type { Task } from "#task/index";
import type * as aggregator from "#aggregator/index";

// import * as clients from "#client/index";
import { LocalClient } from "#client/local_client";
import type { Client } from "#client/client";
import { DecentralizedClient } from "#client/decentralized/decentralized_client";
import { FederatedClient } from "#client/federated/federated_client";

/**
 * Build the client of the given scheme.
 * @param token of a private task, to download its model and join its training
 */
export function getClient<D extends DataType, N extends Network>(
  scheme: N | "local",
  serverURL: URL,
  task: Task<D, N>,
  aggregator: aggregator.Aggregator,
  token?: string,
): Client<N> {
  switch (scheme) {
    case "decentralized": {
      const t = task as Task<D, "decentralized">;
      t.trainingInformation.scheme = scheme;

      return new DecentralizedClient(serverURL, t, aggregator, token);
    }
    case "federated": {
      const t = task as Task<D, "federated">;
      t.trainingInformation.scheme = scheme;

      return new FederatedClient(serverURL, t, aggregator, token);
    }
    case "local": {
      const t = task as Task<D, "local">;
      t.trainingInformation.scheme = scheme;

      return new LocalClient(serverURL, t, aggregator, token);
    }
    default: {
      const _: never = scheme;
      throw new Error("should never happen");
    }
  }
}
