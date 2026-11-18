import "@/buffer-polyfill";
import { workerPeerFactory } from "../components/training/peer_transport";
import type { NodeID } from "@epfml/discojs";
import { measure, peerDriver } from "./peer_transport_shared";
import type { Case, Driver } from "./peer_transport_shared";

self.onmessage = ({
  data: config,
}: MessageEvent<Case & { port: MessagePort }>) => {
  void (async () => {
    try {
      let driver: Driver;
      if (config.mode === "bridge" || config.mode === "webrtc-bridge") {
        const create = workerPeerFactory(config.port);
        driver = await peerDriver(
          Array.from({ length: config.peers }, (_, index) =>
            create(`${index}` as NodeID, true),
          ),
        );
      } else {
        const pending = new Map<number, (data: Uint8Array) => void>();
        config.port.onmessage = ({
          data,
        }: MessageEvent<{ peer: number; bytes: Uint8Array }>) => {
          const resolve = pending.get(data.peer);
          if (resolve === undefined) throw new Error("Unsolicited raw reply");
          pending.delete(data.peer);
          resolve(data.bytes);
        };
        driver = {
          exchange: (bytes, peer) =>
            new Promise((resolve) => {
              pending.set(peer, resolve);
              const data =
                config.mode === "copy-transfer"
                  ? Uint8Array.from(bytes)
                  : bytes;
              config.port.postMessage(
                { peer, bytes: data },
                config.mode === "clone" ? [] : [data.buffer],
              );
            }),
          close: () => {
            config.port.close();
            return Promise.resolve();
          },
        };
      }
      return await measure(config, driver);
    } finally {
      config.port.close();
    }
  })().then(
    (result) => self.postMessage({ result }),
    (error: unknown) =>
      self.postMessage({
        error: error instanceof Error ? error.message : String(error),
      }),
  );
};
self.postMessage({ ready: true });
