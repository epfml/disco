import { Dataset, Text } from "@epfml/discojs";

class LineStream extends TransformStream<string, string> {
  constructor() {
    let current_line = "";

    super({
      transform: (chunk, controller) => {
        const [head, ...lines] = chunk.split(/\r\n|\r|\n/);
        const first_line = current_line + head;

        if (lines.length === 0) {
          current_line = first_line;
          return;
        }

        controller.enqueue(first_line);
        for (const line of lines.slice(0, -1)) controller.enqueue(line);

        current_line = lines[lines.length - 1];
      },
      flush: (controller) => controller.enqueue(current_line),
    });
  }
}

export function load(file: Blob): Dataset<Text> {
  return new Dataset(async function* () {
    const reader = file
      .stream()
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new LineStream())
      .getReader();

    while (true) {
      const { value: chunk, done } = await reader.read();
      if (chunk !== undefined) yield chunk;
      if (done) break;
    }
  });
}
