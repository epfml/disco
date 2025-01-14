import {
	AutoTokenizer,
	type PreTrainedTokenizer,
	env,
} from "@xenova/transformers";
import { List } from "immutable";

type PaddingSide = "left" | "right";

type TokenizeConfig =
	| {
			padding?: undefined;
			truncation?: false;
	  }
	| ((
			| {
					padding: PaddingSide;
					// for a single sequence, padding implies truncation to max_length
					truncation?: true;
			  }
			| {
					truncation: true;
					padding?: PaddingSide;
			  }
	  ) & {
			max_length: number; // the max sequence length
	  });

// serializable wrapper around PreTrainedTokenizer
export class Tokenizer {
	#wrapped: PreTrainedTokenizer;

	constructor(
		public readonly name: string,
		to_wrap: PreTrainedTokenizer,
	) {
		this.#wrapped = to_wrap;
	}

	static async from_pretrained(name: string): Promise<Tokenizer> {
		// Needs to be false in order to prevent transformers.js from reading the local cache
		// and triggering an error when running in the browser
		// Reference: https://medium.com/@GenerationAI/transformers-js-onnx-runtime-webgpu-46c3e58d547c
		env.allowLocalModels = false;
		const to_wrap = await AutoTokenizer.from_pretrained(name);

		return new Tokenizer(name, to_wrap);
	}

	tokenize(text: string, config: TokenizeConfig = {}): List<number> {
		if (config.padding || config.truncation)
			if (!Number.isInteger(config.max_length))
				throw new Error("max_length should be an integer");

		if (config.padding) {
			// The padding side is set as an attribute, not in the config
			this.#wrapped.padding_side = config.padding ?? "left";
			config.truncation = true;
		}

		const tokenizerResult: unknown = this.#wrapped(text, {
			padding: config.padding !== undefined,
			truncation: config.truncation,
			max_length: "max_length" in config ? config.max_length : undefined,
			return_tensor: false,
		});

		if (
			typeof tokenizerResult !== "object" ||
			tokenizerResult === null ||
			!("input_ids" in tokenizerResult) ||
			!isArrayOfNumber(tokenizerResult.input_ids)
		)
			throw new Error("tokenizer returned unexpected type");

		return List(tokenizerResult.input_ids);
	}

	decode(tokens: number[]): string {
		return this.#wrapped.decode(tokens);
	}
}

function isArrayOfNumber(raw: unknown): raw is number[] {
	return Array.isArray(raw) && raw.every((e) => typeof e === "number");
}
