import WS from "ws";

// Federated GPT updates exceed the 100 MiB messages node ws accepts by default,
// Browsers' WebSocket implementations do not have this limitation.
export default class WebSocket extends WS {
  constructor(url, protocols) {
    super(url, protocols, { maxPayload: 1024 * 1024 * 1024 });
  }
}
