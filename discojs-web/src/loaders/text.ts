import { Dataset, Text } from "@epfml/discojs";

export function load(file: Blob): Dataset<Text> {
  return new Dataset(async function* () {
    const reader = file
      .stream()
      .pipeThrough(new TextDecoderStream())
      .getReader();

    while (true) {
      const { value: chunk, done } = await reader.read();
      if (chunk !== undefined) yield chunk;
      if (done) break;
    }
  });
}
