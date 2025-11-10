<template>
  <div class="flex flex-col cards-gap">
    <IconCard>
      <template #title
        ><span>Create your own <DISCOllaborative /></span
      ></template>

      <div>
        Fill in the fields below to create your own <DISCOllaborative />, and
        bring a new (arbitrary) ML task into Disco. Other users using the Disco
        client will be able to join your <DISCOllaborative />
        and contribute to its model, while keeping their data local and private.
      </div>
      <div>
        A <DISCOllaborative /> is made of two main elements:
        <div class="flex justify-left ml-10">
          <p>
            1. the <span class="font-bold">model</span>, any ML model built to
            be trained<br />
            2. the <span class="font-bold">task</span>, which defines how Disco
            will work with the model
          </p>
        </div>
      </div>
    </IconCard>

    <Form
      ref="form"
      :validation-schema="schema"
      class="flex flex-col cards-gap"
      @submit="onSubmit"
      @invalid-submit="onInvalidSubmit"
    >
      <div
        class="grid grid-flow-row-dense grid-cols-1 md:grid-cols-2 xl:grid-cols-3 cards-gap"
      >
        <IconCard>
          <template #title> General </template>

          <FormLabel label="Unique identifier" type="required">
            <FormField
              name="id"
              placeholder="my-task-identifier"
              as="input"
              size="20"
            />
          </FormLabel>

          <FormLabel label="Data type" type="required">
            <FormField
              v-model="dataType"
              name="dataType"
              as="select"
              supress-error
            >
              <option value="image">Image</option>
              <option value="tabular">Tabular</option>
              <option value="text">Text</option>
            </FormField>
          </FormLabel>
        </IconCard>

        <IconCard>
          <template #title> Model </template>

          <div class="flex flex-col">
            <FormLabel
              v-if="dataType === 'image'"
              label="Labels"
              type="required"
            >
              <FieldArray
                v-slot="{ fields, push, remove }"
                name="trainingInformation.LABEL_LIST"
              >
                <div class="flex flex-row flex-wrap elems-gap">
                  <div
                    v-for="(entry, i) in fields"
                    :key="entry.key"
                    class="flex flex-row elems-gap"
                  >
                    <FormField
                      :name="`trainingInformation.LABEL_LIST[${i}]`"
                      placeholder="label"
                      as="input"
                    />

                    <CustomButton @click="remove(i)">
                      <i class="fa-solid fa-xmark"></i>
                    </CustomButton>
                  </div>

                  <CustomButton @click="push('')"> add label </CustomButton>
                </div>
              </FieldArray>
            </FormLabel>

            <div v-if="dataType === 'image'" class="flex flex-row flex-wrap">
              <FormLabel label="Width to scale images to" type="required">
                <FormField
                  name="trainingInformation.IMAGE_W"
                  placeholder="100"
                  as="input"
                  type="number"
                  min="1"
                />
              </FormLabel>

              <FormLabel label="Height to scale images to" type="required">
                <FormField
                  name="trainingInformation.IMAGE_H"
                  placeholder="100"
                  as="input"
                  type="number"
                  min="1"
                />
              </FormLabel>
            </div>

            <FormLabel
              v-if="dataType === 'tabular'"
              label="Input columns names"
              type="required"
            >
              <FieldArray
                v-slot="{ fields, push, remove }"
                name="trainingInformation.inputColumns"
              >
                <div class="flex flex-row flex-wrap elems-gap">
                  <div
                    v-for="(entry, i) in fields"
                    :key="entry.key"
                    class="flex flex-row elems-gap"
                  >
                    <FormField
                      :name="`trainingInformation.inputColumns[${i}]`"
                      placeholder="field_name"
                      as="input"
                    />

                    <CustomButton @click="remove(i)">
                      <i class="fa-solid fa-xmark"></i>
                    </CustomButton>
                  </div>

                  <CustomButton @click="push('')"> add column </CustomButton>
                </div>
              </FieldArray>
            </FormLabel>

            <FormLabel
              v-if="dataType === 'tabular'"
              label="Output column name"
              type="required"
            >
              <FormField
                name="trainingInformation.outputColumn"
                placeholder="predicated_value"
                as="input"
              />
            </FormLabel>

            <div v-if="dataType === 'text'" class="flex flex-row flex-wrap">
              <FormLabel
                label="Name of a HuggingFace tokenizer"
                type="required"
              >
                <FormField
                  name="trainingInformation.tokenizer"
                  placeholder="Xenova/gpt2"
                  as="input"
                />
              </FormLabel>

              <FormLabel
                label="Number of token used for context"
                type="required"
              >
                <FormField
                  name="trainingInformation.contextLength"
                  placeholder="128"
                  as="input"
                  type="number"
                  min="1"
                />
              </FormLabel>
            </div>

            <FormLabel label="TFJS model.json file" type="required">
              <FormField v-slot="{ field }" name="model.topology">
                <FileSelection type="json" v-bind="field" />
              </FormField>
            </FormLabel>

            <div class="flex flex-row flex-wrap">
              <FormLabel label="TFJS model optimizer" type="required">
                <FormField name="model.optimizer.name" as="select">
                  <option value="adadelta">adadelta</option>
                  <option value="adagrad">adagrad</option>
                  <option value="adam">adam</option>
                  <option value="adamax">adamax</option>
                  <option value="rmsprop">rmsprop</option>
                  <option value="sgd">sgd</option>
                </FormField>
              </FormLabel>

              <FormLabel
                label="TFJS model optimizer learning rate"
                type="required"
              >
                <FormField
                  name="model.optimizer.learningRate"
                  placeholder="0.01"
                  as="input"
                  type="number"
                  min="0"
                />
              </FormLabel>

              <FormLabel label="TFJS model loss" type="required">
                <FormField name="model.loss" as="select">
                  <option value="binaryCrossentropy">
                    binary cross-entropy
                  </option>
                  <option value="categoricalCrossentropy">
                    categorical cross-entropy
                  </option>
                  <option value="categoricalHinge">categorical hinge</option>
                  <option value="cosineProximity">cosine proximity</option>
                  <option value="hinge">hinge</option>
                  <option value="kullbackLeiblerDivergence">
                    Kullback-Leibler divergence
                  </option>
                  <option value="logcosh">logcosh</option>
                  <option value="meanAbsoluteError">mean absolute error</option>
                  <option value="meanAbsolutePercentageError">
                    mean absolute percentage error
                  </option>
                  <option value="meanSquaredError">mean squared error</option>
                  <option value="meanSquaredLogarithmicError">
                    mean squared logarithmic error
                  </option>
                  <option value="poisson">poisson</option>
                  <option value="sparseCategoricalCrossentropy">
                    sparse categorical cross-entropy
                  </option>
                  <option value="squaredHinge">squared hinge</option>
                </FormField>
              </FormLabel>
            </div>
          </div>
        </IconCard>

        <IconCard>
          <template #title> Training </template>

          <div class="flex flex-row flex-wrap">
            <FormLabel label="Epochs" type="required">
              <FormField
                name="trainingInformation.epochs"
                placeholder="30"
                as="input"
                type="number"
                min="1"
              />
            </FormLabel>

            <FormLabel label="Batch size" type="required">
              <FormField
                name="trainingInformation.batchSize"
                placeholder="10"
                as="input"
                type="number"
                min="1"
              />
            </FormLabel>

            <FormLabel
              label="Fraction of dataset used for validation"
              type="required"
            >
              <FormField
                name="trainingInformation.validationSplit"
                placeholder="0.1"
                as="input"
                type="number"
                min="0"
                step="0.1"
                max="1"
              />
            </FormLabel>
          </div>
        </IconCard>

        <IconCard>
          <template #title> Network </template>

          <div class="flex flex-col">
            <FormLabel label="Collaborative algorithm" type="required">
              <FormField
                v-model="scheme"
                name="trainingInformation.scheme"
                as="select"
                supress-error
              >
                <option value="federated">Federated</option>
                <option value="decentralized">Decentralized</option>
                <option value="local">Local</option>
              </FormField>
            </FormLabel>

            <FormLabel label="Type of aggregation" type="required">
              <FormField
                v-model="aggregationStrategy"
                name="trainingInformation.aggregationStrategy"
                as="select"
                :disabled="scheme !== 'decentralized'"
              >
                <option value="mean">Mean</option>
                <option value="secure">Secure</option>
              </FormField>

              <FormLabel
                v-show="aggregationStrategy === 'secure'"
                label="Maximum absolute value over all the weights"
              >
                <FormField
                  name="trainingInformation.maxShareValue"
                  placeholder="100"
                  as="input"
                  type="number"
                />
              </FormLabel>
            </FormLabel>

            <FormLabel
              label="Number of epochs before aggregating weights"
              type="required"
            >
              <FormField
                name="trainingInformation.roundDuration"
                placeholder="5"
                as="input"
                type="number"
              />
            </FormLabel>

            <FormLabel
              label="Minimum number of peers per round"
              type="required"
            >
              <FormField
                name="trainingInformation.minNbOfParticipants"
                placeholder="3"
                as="input"
                type="number"
              />
            </FormLabel>

            <FormLabel
              v-model="differentialPrivacy"
              label="Differential privacy"
              type="checkbox"
            >
              <div v-show="differentialPrivacy" class="flex flex-col">
                <FormLabel
                  label="Standard deviation of the noise"
                  type="required"
                >
                  <FormField
                    name="trainingInformation.privacy.noiseScale"
                    placeholder="2"
                    as="input"
                    type="number"
                  />
                </FormLabel>
              </div>
            </FormLabel>

            <FormLabel
              v-model="weightClipping"
              label="Weight clipping"
              type="checkbox"
            >
              <div v-show="weightClipping" class="flex flex-col">
                <FormLabel
                  label="Maximum drift, measured by its norm, that can be made by the aggregated weights each round"
                  type="required"
                >
                  <FormField
                    name="trainingInformation.privacy.clippingRadius"
                    placeholder="40"
                    as="input"
                    type="number"
                  />
                </FormLabel>
              </div>
            </FormLabel>
          </div>
        </IconCard>

        <IconCard>
          <template #title> Description </template>

          <div class="flex flex-col">
            <FormLabel label="Title" type="required">
              <FormField
                name="displayInformation.title"
                placeholder="Home Labelator"
                as="input"
              />
            </FormLabel>

            <FormLabel label="Short description" type="required">
              <FormField
                name="displayInformation.summary.preview"
                placeholder="Detect and label everyday objects"
                as="input"
              />
            </FormLabel>

            <FormLabel label="Extended description" type="required">
              <FormField
                name="displayInformation.summary.overview"
                placeholder="Standard classification model used in computer vision."
                as="textarea"
              />
            </FormLabel>

            <FormLabel label="Model information">
              <FormField
                name="displayInformation.model"
                placeholder="Two-layers convolution network"
                as="input"
              />
            </FormLabel>

            <FormLabel label="Expected data format">
              <FormField
                name="displayInformation.dataFormatInformation"
                :placeholder="
                  dataType === 'image'
                    ? 'Images with a single object and a clear background'
                    : dataType === 'tabular'
                      ? 'Rows made by various meteo stations'
                      : 'Text made of small blog posts'
                "
                as="input"
              />
            </FormLabel>

            <FormLabel
              v-if="dataType === 'image'"
              label="URL to an example image"
            >
              <FormField
                name="displayInformation.dataExample"
                placeholder="https://example.com/image.jpeg"
                as="input"
                type="url"
              />
            </FormLabel>

            <FieldArray
              v-if="dataType === 'tabular'"
              v-slot="{ fields, push, remove }"
              name="displayInformation.dataExample"
            >
              <FormLabel label="Example tabular data">
                <div
                  v-for="(entry, i) in fields"
                  :key="entry.key"
                  class="flex flex-row flex-wrap elems-gap"
                >
                  <FormField
                    :name="`displayInformation.dataExample[${i}].name`"
                    label="Name of the column"
                    placeholder="field_name"
                    as="input"
                  />
                  <FormField
                    :name="`displayInformation.dataExample[${i}].data`"
                    label="Example data"
                    placeholder="1312"
                    as="input"
                  />

                  <CustomButton @click="remove(i)">
                    <i class="fa-solid fa-xmark"></i>
                  </CustomButton>
                </div>

                <div class="flex-none">
                  <CustomButton @click="push({})"> add example </CustomButton>
                </div>
              </FormLabel>
            </FieldArray>

            <FormLabel v-if="dataType === 'text'" label="Excerpt of some text">
              <FormField
                name="displayInformation.dataExample"
                placeholder="First, there was nothing. Then, nothing happened as time didn't exist yet."
                as="input"
              />
            </FormLabel>
          </div>
        </IconCard>
      </div>

      <IconCard>
        <template #title>Joining this task</template>

        <div>
          After submitting the form, others will be able to join the task from
          the
          <RouterLink to="/list" class="underline text-blue-400 cursor-pointer">
            <DISCOllaboratives /> page </RouterLink
          >.
        </div>
      </IconCard>

      <div class="flex justify-center">
        <CustomButton type="submit" class="basis-48"> submit </CustomButton>
      </div>
    </Form>
  </div>
</template>

<script lang="ts" setup>
import createDebug from "debug";
import * as immutable from "immutable";
import { storeToRefs } from "pinia";
import { FieldArray, Form } from "vee-validate";
import { ref, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";
import * as z from "zod";

import * as tf from "@tensorflow/tfjs";

import {
  models,
  pushTask,
  Task,
  Tokenizer,
  TrainingInformation,
  type DataType,
  type Network,
} from "@epfml/discojs";

import { useToaster } from "@/composables/toaster";
import { CONFIG } from "@/config";
import IconCard from "@/components/containers/IconCard.vue";
import CustomButton from "@/components/simple/CustomButton.vue";
import DISCOllaborative from "@/components/simple/DISCOllaborative.vue";
import DISCOllaboratives from "@/components/simple/DISCOllaboratives.vue";
import { useTasksStore } from "@/store";

import FormField from "./FormField.vue";
import FormLabel from "./FormLabel.vue";
import FileSelection from "../dataset_input/FileSelection.vue";

const debug = createDebug("webapp:TaskForm");
const router = useRouter();
const toaster = useToaster();
const { tasks } = storeToRefs(useTasksStore());

const dataType = ref<DataType>("image");
const scheme = ref<Network>("federated");
const aggregationStrategy = ref("mean");
const differentialPrivacy = ref(false);
const weightClipping = ref(false);

const form = useTemplateRef("form");

watch([dataType, form], ([dataType, form]) => {
  if (form === null) return;

  switch (dataType) {
    case "image":
      form.setFieldValue("trainingInformation.LABEL_LIST", [""]);
      break;
    case "tabular":
      form.setFieldValue("trainingInformation.inputColumns", [""]);
      break;
  }
});

watch([scheme, form], ([scheme, form]) => {
  if (form === null) return;

  if (scheme !== "decentralized")
    form.setFieldValue("trainingInformation.aggregationStrategy", "mean");
});

// warn user on page content loss
window.onbeforeunload = (event) => {
  if (form.value === null || form.value.meta.dirty === false) return;
  event.preventDefault();
};

const nonLocalNetwork = {
  privacy: z
    .object({
      clippingRadius: z.number().optional(),
      noiseScale: z.number().optional(),
    })
    .optional()
    .transform((arg, ctx) => {
      if (!differentialPrivacy.value) return undefined;

      function addUndefIssue(field?: string): void {
        const path = field !== undefined ? [field] : undefined;
        ctx.addIssue({
          code: "custom",
          message: "Required",
          path,
        });
      }

      if (arg === undefined) {
        addUndefIssue();
        return z.NEVER;
      }
      if (arg.clippingRadius === undefined) addUndefIssue("clippingRadius");
      if (arg.noiseScale === undefined) addUndefIssue("noiseScale");
      if (arg.clippingRadius === undefined || arg.noiseScale === undefined)
        return z.NEVER;

      return arg;
    }),
  minNbOfParticipants: z.number().positive().int(),
};
const trainingInformationNetworks = z.union([
  z
    .object({
      scheme: z.literal("decentralized"),
      ...nonLocalNetwork,
    })
    .and(
      z.union([
        z.object({
          aggregationStrategy: z.literal("mean"),
        }),
        z.object({
          aggregationStrategy: z.literal("secure"),
          maxShareValue: z.number().positive().int(),
        }),
      ]),
    ),
  z.object({
    scheme: z.literal("federated"),
    aggregationStrategy: z.literal("mean"),
    ...nonLocalNetwork,
  }),
  z.object({
    scheme: z.literal("local"),
    aggregationStrategy: z.literal("mean"),
  }),
]);

// from https://github.com/tensorflow/tfjs/blob/master/tfjs-core/src/optimizers/optimizer_constructors.ts
const modelOptimizerNames = [
  "adadelta",
  "adagrad",
  "adam",
  "adamax",
  // "momentum", TODO requires a second argument
  "rmsprop",
  "sgd",
] as const;
const TFJSModelSchema = {
  model: z.object({
    // from https://github.com/tensorflow/tfjs/blob/master/tfjs-layers/src/losses.ts#L242
    loss: z.enum([
      "binaryCrossentropy",
      "categoricalCrossentropy",
      "categoricalHinge",
      "cosineProximity",
      "hinge",
      "kullbackLeiblerDivergence",
      "logcosh",
      "meanAbsoluteError",
      "meanAbsolutePercentageError",
      "meanSquaredError",
      "meanSquaredLogarithmicError",
      "poisson",
      "sparseCategoricalCrossentropy",
      "squaredHinge",
    ]),
    optimizer: z.object({
      name: z.enum(modelOptimizerNames),
      learningRate: z.number().positive(),
    }),
    topology: z.unknown().transform((fileOrSet, ctx) => {
      if (fileOrSet === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "Missing JSON file",
        });
        return z.NEVER;
      }

      // TODO why is it returning a single file instead of a set?
      switch (true) {
        case fileOrSet instanceof File:
          return fileOrSet;
        case immutable.isSet(fileOrSet): {
          const file = fileOrSet.first();

          if (file === undefined || fileOrSet.size !== 1)
            throw new Error("FileSelection didn't return a single item Set");
          if (!(file instanceof File))
            throw new Error("FileSelection didn't return a Set of File");

          return file;
        }
        default:
          throw new Error("FileSelection didn't return a File");
      }
    }),
  }),
};

const schema = z
  .object({
    ...Task.baseSchema.shape,
    trainingInformation: z.object({
      ...TrainingInformation.baseSchema.shape,
      tensorBackend: z.literal("tfjs").default("tfjs"),
    }),
  })
  .and(
    z.union([
      z.object({
        ...Task.dataTypeToSchema.image.shape,
        ...TFJSModelSchema,
        trainingInformation: TrainingInformation.dataTypeToSchema.image.and(
          trainingInformationNetworks,
        ),
      }),
      z.object({
        ...Task.dataTypeToSchema.tabular.shape,
        ...TFJSModelSchema,
        trainingInformation: TrainingInformation.dataTypeToSchema.tabular.and(
          trainingInformationNetworks,
        ),
      }),
      z.object({
        ...Task.dataTypeToSchema.text.shape,
        ...TFJSModelSchema,
        trainingInformation: z
          .object({
            ...TrainingInformation.dataTypeToSchema.text.shape,
            tokenizer: z.string().transform(async (name, ctx) => {
              try {
                return await Tokenizer.from_pretrained(name);
              } catch {
                ctx.addIssue({
                  code: "custom",
                  message: "Unable to load tokenizer from HuggingFace",
                });
                return z.NEVER;
              }
            }),
          })
          .and(trainingInformationNetworks),
      }),
    ]),
  );

async function onSubmit(form: unknown): Promise<void> {
  // TODO double check as @submit isn't generic vee-validate#4845
  if (typeof form !== "object" || form === null)
    throw new Error("zod validated form isn't one");
  const { model: rawModel, ...rawTask }: Partial<Record<string, unknown>> =
    form;

  const task = await Task.schema.parseAsync(rawTask);

  if (typeof rawModel !== "object" || rawModel === null)
    throw new Error("zod validated model info isn't one");
  const { topology, loss, optimizer }: Partial<Record<string, unknown>> =
    rawModel;
  if (
    !(topology instanceof File) ||
    typeof loss !== "string" ||
    !(
      typeof optimizer === "object" &&
      optimizer !== null &&
      "name" in optimizer &&
      typeof optimizer["name"] === "string" &&
      "learningRate" in optimizer &&
      typeof optimizer["learningRate"] === "number"
    )
  )
    throw new Error("zod validated model info aren't valid");
  switch (optimizer.name) {
    case modelOptimizerNames[0]:
    case modelOptimizerNames[1]:
    case modelOptimizerNames[2]:
    case modelOptimizerNames[3]:
    case modelOptimizerNames[4]:
    case modelOptimizerNames[5]:
      // @ts-expect-error whole array is valid
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      modelOptimizerNames[6];
      break;
    default:
      throw new Error("zod validated model info aren't valid");
  }

  // TODO TFJS' browserFiles hangs when parsing invalid JSON tfjs#8517
  try {
    JSON.parse(await topology.text());
  } catch {
    toaster.error("Model file isn't valid");
    return;
  }

  let model;
  try {
    switch (task.dataType) {
      case "image":
      case "tabular": {
        const loaded = await tf.loadLayersModel(tf.io.browserFiles([topology]));
        loaded.compile({
          loss,
          optimizer: tf.train[optimizer.name](optimizer.learningRate),
        });
        model = new models.TFJS(task.dataType, loaded);
        break;
      }
      case "text":
        toaster.error("Currently no support of TFJS text model");
        return;
    }
  } catch (e) {
    debug("load TFJS model: %o", e);
    toaster.error("Model loading failed");
    return;
  }

  try {
    await pushTask(CONFIG.serverUrl, task, model);
  } catch (e) {
    debug("while pushing task to server: %o", e);
    if (e instanceof Error && e.message.endsWith("HTTP status 409"))
      toaster.error("This identifier is already taken");
    else toaster.error("An error occured server-side");
    return;
  }

  if (typeof tasks.value === "string")
    debug("tasks store not available, skipping adding task to it");
  else tasks.value = tasks.value.set(task.id, task);

  await router.push("/list");
}

function onInvalidSubmit({
  errors,
}: {
  errors: Partial<Record<string, string>>;
}): void {
  const field = document.querySelector(
    `label:has(${Object.keys(errors)
      .map((name) => `> [name="${name}"]`)
      .join(",")})`,
  );
  if (field === null) throw new Error("unable to find erroneous field");

  field.scrollIntoView({ behavior: "smooth" });
}
</script>

<style lang="css" scoped>
.elems-gap {
  gap: 0.75rem;
}

label label {
  font-size: smaller;
}
</style>
