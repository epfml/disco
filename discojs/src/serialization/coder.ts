import * as msgpack from "@msgpack/msgpack";

export type Encoded = Uint8Array;

export function isEncoded(raw: unknown): raw is Encoded {
  if (!(raw instanceof Uint8Array)) return false;

  const _: Encoded = raw;

  return true;
}

// create a new buffer instead of referencing the backing one
function copy(arr: Uint8Array): Uint8Array {
  // `Buffer.slice` (subclass of Uint8Array on Node) doesn't copy
  // thus doesn't respect Liskov substitution principle
  // https://nodejs.org/api/buffer.html#bufslicestart-end
  // here we call the correct implementation
  return Uint8Array.prototype.slice.call(arr);
}

// to avoid mapping every ArrayBuffer to Uint8Array,
// we register our own convertors for the type we know are needed
// type id are arbitrally taken from msgpack-lite
// https://www.npmjs.com/package/msgpack-lite#extension-types
const CODEC = new msgpack.ExtensionCodec();
// used by TFJS's weights
CODEC.register({
  type: 0x17,
  encode(obj: unknown): Uint8Array | null {
    if (!(obj instanceof Float32Array)) return null;
    return new Uint8Array(obj.buffer, obj.byteOffset, obj.byteLength);
  },
  decode: (raw: Uint8Array): Float32Array =>
    // to reinterpred uint8 into float32, it needs to be 4-bytes aligned
    // but the given buffer might not be so we need to copy it.
    new Float32Array(copy(raw).buffer),
});
// used by TFJS's saved model
CODEC.register({
  type: 0x1a,
  encode(obj: unknown): Uint8Array | null {
    if (!(obj instanceof ArrayBuffer)) return null;
    return new Uint8Array(obj);
  },
  decode: (raw: Uint8Array): ArrayBuffer =>
    // need to copy as backing ArrayBuffer might be larger
    copy(raw),
});

export function encode(serialized: unknown): Encoded {
  return msgpack.encode(serialized, { extensionCodec: CODEC });
}

export function decode(encoded: Encoded): unknown {
  return msgpack.decode(encoded, { extensionCodec: CODEC });
}
