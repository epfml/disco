<template>
  <div class="flex flex-col">
    <label class="flex flex-col">
      Enter the text that you want completed

      <textarea
        placeholder="In the beginning"
        minlength="1000"
        @change="generate()"
        ref="input"
      />
    </label>

    <CustomButton @click="generate()"> generate </CustomButton>

    <p ref="output" />

    <!-- TODO add note saying that you should train more  -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRaw } from "vue";

import type { Model, Task } from "@epfml/discojs";
import { models } from "@epfml/discojs";

import { useToaster } from "@/composables/toaster";
import CustomButton from "@/components/simple/CustomButton.vue";

const props = defineProps<{
  task: Task;
  model?: Model;
}>();

const input = ref<HTMLTextAreaElement | null>(null);
const output = ref<HTMLParagraphElement | null>(null);

const generatingFor = ref<string>("In the beginning");

const tokenizer = computed(() => models.getTaskTokenizer(props.task));
const gptModel = computed(() => {
  if (props.model === undefined) return undefined;
  if (!(props.model instanceof models.GPT))
    throw new Error("can only generate with GPT models");
  return props.model;
});

const toaster = useToaster();

async function generate(): Promise<void> {
  if (input.value === null) throw new Error("input not mounted");
  //const prompt = input.value.value;
  //if (prompt === null) throw new Error("null prompt");
  if (gptModel.value === undefined) {
    toaster.error("Select a model to chat with first");
    return;
  }

  const prompt =
    "The game began development in 2010 , carrying over a large portion, The game began development in 2010 , carrying over a large portion, The game began development in 2010 , carrying over a large portion,";
  const nbNewTokens = 200;

  generatingFor.value = prompt;

  console.log("prompt:", prompt);
  console.log("model:", toRaw(gptModel.value));
  console.log("tokenizer:", toRaw(await tokenizer.value));

  const generated = await gptModel.value.generate(
    prompt,
    await tokenizer.value,
    nbNewTokens,
  );

  console.log("generated:", generated);

  if (generatingFor.value !== prompt) return; // more recent input

  if (output.value === null) {
    console.warn("output not mounted, discarding generated output");
    return;
  }
  output.value.textContent = generated;
}
</script>
