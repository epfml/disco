import { z } from "zod";

import type { DataType, Network } from "../index.js";
import { Tokenizer } from "../index.js";

const privacySchema = z.object({
	// reduce training accuracy and improve privacy.
	differentialPrivacy: z
		.object({
			// maximum weights difference between each epoch, used for differential privacy
			clippingRadius: z.number().positive().default(1),
			// privacy budget, used to compute the variance of Gaussian noise
			epsilon: z.number().positive(),
			// small probability that the privacy guarantee may not hold
			delta: z.number().gt(0).lt(1),
		})
		.optional(),
});

const nonLocalNetworkSchema = z
	.object({
		// minimum number of participants required to train collaboratively
		// In decentralized Learning the default is 3, in federated learning it is 2
		minNbOfParticipants: z.number().positive().int(),
	})
	.and(
		z.union([
			z.object({
				aggregationStrategy: z.literal("mean"),
				privacy: privacySchema
					.transform((o) => (o.differentialPrivacy === undefined ? undefined : o))
					.optional(),
			}),
			z.object({
				aggregationStrategy: z.literal("byzantine"),
				privacy: z.object({
					...privacySchema.shape,
					byzantineFaultTolerance: z.object({
						// maximum weights difference between each round
						clippingRadius: z.number().positive(),
						maxIterations: z.number().int().positive().default(1),
						beta: z.number().min(0).max(1).default(0.9),
					}),
				}),
			}),
			z.object({
				aggregationStrategy: z.literal("secure"),
				privacy: privacySchema
					.transform((o) => (o.differentialPrivacy === undefined ? undefined : o))
					.optional(),
				// Secure Aggregation: maximum absolute value of a number in a randomly generated share
				// default is 100, must be a positive number, check the docs/PRIVACY.md file for more information on significance of maxShareValue selection
				maxShareValue: z.number().positive().int().optional().default(100),
			}),
		]),
	);

export namespace TrainingInformation {
	export const baseSchema = z.object({
		// number of epochs to run training for
		epochs: z.number().positive().int(),
		// number of epochs between each weight sharing round.
		// e.g.if 3 then weights are shared every 3 epochs (in the distributed setting).
		roundDuration: z.number().positive().int(),
		// for GPT text tasks, number of training batches between each weight sharing round.
		roundIterations: z.number().positive().int().optional(),
		// fraction of data to keep for validation, note this only works for image data
		validationSplit: z.number().min(0).max(1),
		// batch size of training data
		batchSize: z.number().positive().int(),
		// Tensor framework used by the model
		tensorBackend: z.enum(["gpt", "tfjs"]),
	});

	export const dataTypeToSchema = {
		image: z.object({
			// classes, e.g. if two class of images, one with dogs and one with cats, then we would
			// define ['dogs', 'cats'].
			LABEL_LIST: z.array(z.string()).min(1),
			// height of image to resize to
			IMAGE_W: z.number().positive().int(),
			// width of image to resize to
			IMAGE_H: z.number().positive().int(),
		}),
		tabular: z.object({
			// the columns to be chosen as input data for the model
			inputColumns: z.array(z.string()),
			// the columns to be predicted by the model
			outputColumn: z.string(),
		}),
		text: z.object({
			// should be set with the name of a Transformers.js pre-trained tokenizer, e.g., 'Xenova/gpt2'.
			tokenizer: z.instanceof(Tokenizer),
			// the maximum length of a input string used as input to a GPT model. It is used during preprocessing to
			// truncate strings to a maximum length. The default value is tokenizer.model_max_length
			contextLength: z.number().positive().int(),
		}),
	} satisfies Record<DataType, unknown>;

	export const networkToSchema = {
		decentralized: z
			.object({
				scheme: z.literal("decentralized"),
				aggregationStrategy: z.literal(["byzantine", "mean", "secure"]),
			})
			.and(nonLocalNetworkSchema),
		federated: z
			.object({
				scheme: z.literal("federated"),
				aggregationStrategy: z.literal(["byzantine", "mean"]),
			})
			.and(nonLocalNetworkSchema),
		local: z.object({
			scheme: z.literal("local"),
			aggregationStrategy: z.literal("mean"),
		}),
	} satisfies Record<Network, unknown>;
}

export type TrainingInformation<
	D extends DataType,
	N extends Network,
> = z.infer<typeof TrainingInformation.baseSchema> &
	z.infer<(typeof TrainingInformation.dataTypeToSchema)[D]> &
	z.infer<(typeof TrainingInformation.networkToSchema)[N]>;
