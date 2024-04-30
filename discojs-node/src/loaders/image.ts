import sharp from "sharp";
import * as path from "node:path";
import * as fs from "node:fs/promises";

import { Dataset, Image } from "@epfml/discojs";

export async function load(path: string): Promise<Image> {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({
    resolveWithObject: true,
  });

  return {
    data,
    width: info.width,
    height: info.height,
  };
}

export async function loadAllInDir(dir: string): Promise<Dataset<Image>> {
  const filenames = await fs.readdir(dir);
  const paths = filenames.map((f) => path.join(dir, f));

  return new Dataset(paths).map(load);
}
