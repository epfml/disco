import * as msgpack from "@msgpack/msgpack";

export type Encoded = Uint8Array;

export function isEncoded(raw: unknown): raw is Encoded {
  if (!(raw instanceof Uint8Array)) return false;

  const _: Encoded = raw;

  return true;
}

const CODEC = new msgpack.ExtensionCodec();
CODEC.register({
  type: 0x17,
  encode(obj: unknown): Uint8Array | null {
    if (!(obj instanceof Float32Array)) return null;
    return new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength);
  },
  decode: (raw: Uint8Array): Float32Array =>
    // need to align buffer so copy
    new Float32Array(raw.slice().buffer),
});
CODEC.register({
  type: 0x1a,
  encode(obj: unknown): Uint8Array | null {
    if (!(obj instanceof ArrayBuffer)) return null;
    return new Uint8Array(obj);
  },
  decode: (raw: Uint8Array): ArrayBuffer =>
    // need to copy as backing ArrayBuffer is larger
    raw.slice(),
});

export function encode(serialized: unknown): Encoded {
  return msgpack.encode(serialized, { extensionCodec: CODEC });
}

export function decode(encoded: Encoded): unknown {
  return msgpack.decode(encoded, { extensionCodec: CODEC });
}
