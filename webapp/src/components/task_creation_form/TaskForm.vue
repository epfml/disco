<template>
  <Form
    @submit="onSubmit"
    :validation-schema="toTypedSchema(schema)"
    class="flex flex-col cards-gap"
  >
    <div
      class="grid grid-flow-row-dense grid-cols-1 md:grid-cols-2 xl:grid-cols-3 cards-gap"
    >
      <IconCard>
        <template #title> General </template>

        <FormLabel label="Unique identifier">
          <FormField
            name="id"
            placeholder="my-task-identifier"
            as="input"
            size="20"
          />
        </FormLabel>

        <FormLabel label="Category of data">
          <FormField name="dataType" as="select" v-model="dataType">
            <option value="image">Image</option>
            <option value="tabular">Tabular</option>
            <option value="text">Text</option>
          </FormField>
        </FormLabel>
      </IconCard>

      <IconCard>
        <template #title> Model </template>

        <div class="flex flex-col">
          <FormLabel v-if="dataType === 'image'" label="Labels">
            <FieldArray
              name="trainingInformation.LABEL_LIST"
              v-slot="{ fields, push, remove }"
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

          <div v-if="dataType === 'image'" class="flex flex-row">
            <FormLabel label="Width to scale images to">
              <FormField
                name="trainingInformation.IMAGE_W"
                placeholder="100"
                as="input"
                type="number"
                min="1"
              />
            </FormLabel>

            <FormLabel label="Height to scale images to">
              <FormField
                name="trainingInformation.IMAGE_H"
                placeholder="100"
                as="input"
                type="number"
                min="1"
              />
            </FormLabel>
          </div>

          <FormLabel v-if="dataType === 'tabular'" label="Input columns names">
            <FieldArray
              name="trainingInformation.inputColumns"
              v-slot="{ fields, push, remove }"
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

          <FormLabel v-if="dataType === 'tabular'" label="Output column name">
            <FormField
              name="trainingInformation.outputColumn"
              placeholder="predicated_value"
              as="input"
            />
          </FormLabel>

          <div v-if="dataType === 'text'" class="flex flex-row flex-wrap">
            <FormLabel label="Name of a HuggingFace tokenizer">
              <FormField
                name="trainingInformation.tokenizer"
                placeholder="Xenova/gpt2"
                as="input"
              />
            </FormLabel>

            <FormLabel label="Number of token used for context">
              <FormField
                name="trainingInformation.contextLength"
                placeholder="128"
                as="input"
                type="number"
                min="1"
              />
            </FormLabel>
          </div>

          <FormLabel label="TFJS model.json file">
            <FormField
              name="model.topology"
              v-slot="{ handleChange, handleBlur }"
            >
              <FileSelection
                type="json"
                @update:modelValue="handleChange"
                @blur="handleBlur"
              />
            </FormField>
          </FormLabel>

          <div class="flex flex-row flex-wrap">
            <FormLabel label="TFJS model optimizer">
              <FormField name="model.optimizer" placeholder="sgd" as="input" />
            </FormLabel>

            <FormLabel label="TFJS model loss">
              <FormField name="model.loss" placeholder="hinge" as="input" />
            </FormLabel>
          </div>
        </div>
      </IconCard>

      <IconCard>
        <template #title> Training </template>

        <div class="flex flex-row flex-wrap">
          <FormLabel label="Number of pass over the data">
            <FormField
              name="trainingInformation.epochs"
              placeholder="30"
              as="input"
              type="number"
              min="1"
            />
          </FormLabel>

          <FormLabel label="Number of dataset element to process at once">
            <FormField
              name="trainingInformation.batchSize"
              placeholder="10"
              as="input"
              type="number"
              min="1"
            />
          </FormLabel>

          <FormLabel label="Fraction of dataset used for validation">
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
          <FormLabel label="Kind of network to run on">
            <FormField name="trainingInformation.scheme" as="select">
              <option value="federated">Federated</option>
              <option value="decentralized">Decentralized</option>
              <option value="local">Local</option>
            </FormField>
          </FormLabel>

          <FormLabel label="Type of aggregation to perform">
            <FormField
              name="trainingInformation.aggregationStrategy"
              as="select"
            >
              <option value="mean">Mean</option>
              <option value="secure">Secure</option>
            </FormField>
          </FormLabel>

          <FormLabel label="Number of epoch before exchanging with the network">
            <FormField
              name="trainingInformation.roundDuration"
              placeholder="5"
              as="input"
              type="number"
            />
          </FormLabel>

          <FormLabel label="Minimum number of peers per round">
            <FormField
              name="trainingInformation.minNbOfParticipants"
              placeholder="3"
              as="input"
              type="number"
            />
          </FormLabel>

          <FormLabel label="Differential privacy">
            <div class="flex flex-col">
              <FormLabel label="Maximum weights difference between each round">
                <FormField
                  name="trainingInformation.privacy.clippingRadius"
                  placeholder="40"
                  as="input"
                  type="number"
                />
              </FormLabel>

              <FormLabel label="Size of the noise added to the weights">
                <FormField
                  name="trainingInformation.privacy.noiseScale"
                  placeholder="2"
                  as="input"
                  type="number"
                />
              </FormLabel>
            </div>
          </FormLabel>

          <FormLabel label="Secure Aggregation">
            <FormLabel label="Maximum value of a single weight">
              <FormField
                name="trainingInformation.maxShareValue"
                placeholder="100"
                as="input"
                type="number"
              />
            </FormLabel>
          </FormLabel>
        </div>
      </IconCard>

      <IconCard>
        <template #title> Description </template>

        <div class="flex flex-col">
          <FormLabel label="Title">
            <FormField
              name="displayInformation.title"
              placeholder="Home Labelator"
              as="input"
            />
          </FormLabel>

          <FormLabel label="Short description">
            <FormField
              name="displayInformation.summary.preview"
              placeholder="Detect and label everyday objects"
              as="input"
            />
          </FormLabel>

          <FormLabel label="Extended description">
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
              placeholder="Images with a single object and a clear background"
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
            name="displayInformation.dataExample"
            v-slot="{ fields, push, remove }"
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
      <template #title> How to join after ?</template>

      <div>
        After submitting the form, others will be able to join the task from the
        <RouterLink to="/list" class="underline text-blue-400 cursor-pointer">
          <DISCOllaboratives /> page</RouterLink
        >.
      </div>
    </IconCard>

    <div class="flex justify-center">
      <CustomButton type="submit" class="basis-48"> submit </CustomButton>
    </div>
  </Form>
</template>

<style lang="css" scoped>
.elems-gap {
  gap: 0.75rem;
}
</style>

<script lang="ts" setup>
import createDebug from "debug";
import { storeToRefs } from "pinia";
import { FieldArray, Form } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { ref } from "vue";
import * as z from "zod";

import { isSet } from "immutable";
import * as tf from "@tensorflow/tfjs";

import { models, pushTask, Task } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster";
import { CONFIG } from "@/config";
import IconCard from "@/components/containers/IconCard.vue";
import CustomButton from "@/components/simple/CustomButton.vue";
import DISCOllaboratives from "@/components/simple/DISCOllaboratives.vue";
import { useTasksStore } from "@/store";

import FormField from "./FormField.vue";
import FormLabel from "./FormLabel.vue";
import FileSelection from "../dataset_input/FileSelection.vue";

const debug = createDebug("webapp:TaskForm");
const toaster = useToaster();
const { tasks } = storeToRefs(useTasksStore())

const dataType = ref();

const TFJSModelSchema = z.object({
  model: z.object({
    loss: z.string(),
    optimizer: z.string(),
    topology: z.unknown().transform((files, ctx) => {
      if (files === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Missing JSON file",
        });
        return z.NEVER;
      }
      if (!isSet(files)) throw new Error("FileSelection didn't return a Set");

      const file = files.first();
      if (file === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "No model selected",
        });
        return z.NEVER;
      }

      if (!(file instanceof File))
        throw new Error("FileSelection didn't return Set<File>");
      return file;
    }),
  }),
});

const TFJSBackendSchema = z.object({
  tensorBackend: z.literal("tfjs").default("tfjs"),
});

const schema =
  // no object methods on discriminated union zod#1768
  z.discriminatedUnion(
    Task.schema.discriminator,
    // options.map doesn't keep size
    [
      Task.schema.options[0]
        .merge(
          z.object({
            trainingInformation:
              Task.schema.options[0].shape.trainingInformation.merge(
                TFJSBackendSchema,
              ),
          }),
        )
        .merge(TFJSModelSchema),
      Task.schema.options[1]
        .merge(
          z.object({
            trainingInformation:
              Task.schema.options[1].shape.trainingInformation.merge(
                TFJSBackendSchema,
              ),
          }),
        )
        .merge(TFJSModelSchema),
      Task.schema.options[2]
        .merge(
          z.object({
            trainingInformation:
              Task.schema.options[2].shape.trainingInformation.merge(
                TFJSBackendSchema,
              ),
          }),
        )
        .merge(TFJSModelSchema),
    ],
  );
// @ts-expect-error all options are used
Task.schema.options[3];

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
    typeof optimizer !== "string"
  )
    throw new Error("zod validated model info aren't valid");

  toaster.success("Form validation succeeded! Uploading...");

  let model;
  try {
    switch (task.dataType) {
      case "image":
      case "tabular": {
        const loaded = await tf.loadLayersModel(tf.io.browserFiles([topology]));
        loaded.compile({ loss, optimizer });
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
    toaster.error("An error occured server-side");
    debug("while pushing task to server: %o", e);
    return;
  }
  toaster.success("Task successfully submitted");

  if (typeof tasks.value === "string") {
    debug("tasks store not available, skipping adding task to it");
    return;
  }
  tasks.value = tasks.value.set(task.id, task);
}
</script>
