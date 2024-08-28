import { Image as DiscoImage } from "@epfml/discojs";

export async function load(file: Blob): Promise<DiscoImage<4>> {
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.src = url;
  await image.decode();
  URL.revokeObjectURL(url);

  const [width, height] = [image.naturalWidth, image.naturalHeight];

  const context = new OffscreenCanvas(width, height).getContext("2d");
  if (context === null) throw new Error("unable to setup image convertor");
  context.drawImage(image, 0, 0);
  const data = new Uint8Array(context.getImageData(0, 0, width, height).data);

  return new DiscoImage(data, width, height, 4);
}
