import { Image as DiscoImage } from "@epfml/discojs";

export async function load(file: Blob): Promise<DiscoImage<4>> {
  const image = await createImageBitmap(file);
  const [width, height] = [image.width, image.height];

  const context = new OffscreenCanvas(width, height).getContext("2d");
  if (context === null) {
    image.close();
    throw new Error("unable to setup image convertor");
  }
  context.drawImage(image, 0, 0);
  image.close();
  const data = new Uint8Array(context.getImageData(0, 0, width, height).data);

  return new DiscoImage(data, width, height, 4);
}
