import { Repeat, Seq } from "immutable";
import { createJimp } from "@jimp/core";
import * as jimpResize from "@jimp/plugin-resize";

import { Image } from "../index.js";

/** Image where intensity is represented in the range 0..1 */
export class NormalizedImage<
  D extends 1 | 3 | 4 = 1 | 3 | 4,
  W extends number = number,
  H extends number = number,
> {
  // private as it doesn't check that array content is valid
  private constructor(
    public readonly data: Readonly<Float32Array>,
    public readonly width: W,
    public readonly height: H,
    public readonly depth: D,
  ) {
    if (data.length != width * height * depth)
      throw new Error("data isn't of expected size");
  }

  static from<
    D extends 1 | 3 | 4 = 1 | 3 | 4,
    W extends number = number,
    H extends number = number,
  >(image: Image<D, W, H>): NormalizedImage<D, W, H> {
    return new NormalizedImage(
      Float32Array.from(image.data).map((v) => v / 255),
      image.width,
      image.height,
      image.depth,
    );
  }
}

/** Add a full opaque alpha channel to an image */
function addAlpha<W extends number, H extends number>(
  image: Image<3 | 4, W, H>,
): Image<4, W, H> {
  switch (image.depth) {
    case 3:
      return new Image(
        Uint8Array.from(
          // we are adding a channel, so for every 3 byte in the base image,
          // we need to add a fourth. we choose to "expand" the last channel
          // to two value, the channel base value and the transparency.
          // let's say we want to add a byte A to the bytestring RGB
          // [R, G, B] -> [[R], [G], [B, A]] -> [R, G, B, A]
          Seq(image.data).flatMap((v, i) => {
            const OPAQUE = 0xff;
            if (i % 3 !== 2) return [v];
            else return [v, OPAQUE];
          }),
        ),
        image.width,
        image.height,
        4,
      );
    case 4:
      return new Image(image.data, image.width, image.height, image.depth);
  }
}

/** Remove the alpha channel of an image */
export function removeAlpha<W extends number, H extends number>(
  image: Image<4, W, H>,
): Image<3, W, H>;
export function removeAlpha<
  D extends 1 | 3,
  W extends number,
  H extends number,
>(image: Image<D | 4, W, H>): Image<D, W, H>;
export function removeAlpha<W extends number, H extends number>(
  image: Image<1 | 3 | 4, W, H>,
): Image<1 | 3, W, H> {
  switch (image.depth) {
    case 1:
    case 3:
      return new Image(image.data, image.width, image.height, image.depth);
    case 4:
      return new Image(
        image.data.filter((_, i) => i % 4 !== 3),
        image.width,
        image.height,
        3,
      );
  }
}

/** Convert monochrome images to multicolor */
export function expandToMulticolor<W extends number, H extends number>(
  image: Image<1, W, H>,
): Image<3, W, H>;
export function expandToMulticolor<
  D extends 3 | 4,
  W extends number,
  H extends number,
>(image: Image<1 | D, W, H>): Image<D, W, H>;
export function expandToMulticolor<W extends number, H extends number>(
  image: Image<1 | 3 | 4, W, H>,
): Image<3 | 4, W, H> {
  switch (image.depth) {
    case 1:
      return new Image(
        Uint8Array.from(Seq(image.data).flatMap((v) => Repeat(v, 3))),
        image.width,
        image.height,
        3,
      );
    case 3:
    case 4:
      return new Image(image.data, image.width, image.height, image.depth);
  }
}

export function resize<D extends 1 | 3 | 4, W extends number, H extends number>(
  width: W,
  height: H,
  image: Image<D, number, number>,
): Image<4, W, H> {
  const Jimp = createJimp({
    plugins: [jimpResize.methods],
  });

  const resized = new Jimp(addAlpha(expandToMulticolor(image))).resize({
    w: width,
    h: height,
  });

  return new Image(new Uint8Array(resized.bitmap.data), width, height, 4);
}

export function normalize<
  D extends 1 | 3 | 4,
  W extends number,
  H extends number,
>(image: Image<D, W, H>): NormalizedImage<D, W, H> {
  return NormalizedImage.from(image);
}
