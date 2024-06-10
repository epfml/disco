import sharp from "sharp";
import * as path from "node:path";
import * as fs from "node:fs/promises";

import { Dataset, Image } from "@epfml/discojs";

export async function load(path: string): Promise<Image<1 | 3 | 4>> {
  const { data, info } = await sharp(path).raw().toBuffer({
    resolveWithObject: true,
  });

  if (info.channels === 2) throw new Error("unsupported channel count");

  return new Image<1 | 3 | 4>(data, info.width, info.height, info.channels);
}

export async function loadAllInDir(dir: string): Promise<Dataset<Image>> {
  const filenames = await fs.readdir(dir);
  const paths = filenames.map((f) => path.join(dir, f));

  return new Dataset(paths).map(load);
}
