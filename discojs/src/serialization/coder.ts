import * as msgpack from "msgpack-lite";

export type Encoded = Uint8Array;

export function isEncoded(raw: unknown): raw is Encoded {
  if (!(raw instanceof Uint8Array)) return false;

  const _: Encoded = raw;

  return true;
}

const CODEC = msgpack.createCodec({
  preset: true,

  // Buffer doesn't exists in browsers
  binarraybuffer: true,
  uint8array: true,
});

export function encode(serialized: unknown): Encoded {
  return msgpack.encode(serialized, { codec: CODEC });
}

export function decode(encoded: Encoded): unknown {
  return msgpack.decode(encoded, { codec: CODEC });
}
