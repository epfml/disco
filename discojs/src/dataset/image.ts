/**
 * Raw image with type level dimensions.
 *
 * Per convention, `data` layout is as follow
 *  `height` chunk each containing
 *    `width` chunk each containing
 *      a chunk of `depth` bytes
 *
 * @typeParam D depth of the image
 * @typeParam W width, positive and integral
 * @typeParam H height, positive and integral
 */
export class Image<
  D extends 1 | 3 | 4 = 1 | 3 | 4,
  W extends number = number,
  H extends number = number,
> {
  constructor(
    public readonly data: Readonly<Uint8Array>,
    public readonly width: W,
    public readonly height: H,
    public readonly depth: D,
  ) {
    if (data.length != width * height * depth)
      throw new Error("data isn't of expected size");
  }
}
