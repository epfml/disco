export { Client } from "./client.js";

export type { NodeID } from "./types.js";

export {
  messages as decentralizedMessages,
  DecentralizedClient,
} from "./decentralized/index.js";
export {
  messages as federatedMessages,
  FederatedClient,
} from "./federated/index.js";
//
// eslint-disable-next-line no-restricted-syntax -- namespace re-export acceptable here
export * as mtype from "./mtype.js";
export { getClient } from "./get_client.js";

export { LocalClient } from "./local_client.js";
