<template>
  <div class="flex h-full flex-col lg:flex-row">
    <!-- Main Content -->
    <div class="flex flex-col flex-1 order-2 lg:order-1">
      <div class="lg:mx-10 xl:mx-12 mt-2">
        <p
          class="font-disco text-xl lg:text-2xl font-bold text-heading-light dark:text-heading-dark"
        >
          LLM Playground
        </p>
      </div>

      <!-- Generation (read-only): the generated parts are highlighted -->
      <div class="flex-1 lg:mx-10 xl:mx-12 my-4 flex flex-col relative">
        <div
          ref="outputRef"
          class="flex-1 min-h-[300px] lg:min-h-0 overflow-y-auto whitespace-pre-wrap break-words rounded-lg p-3 pb-12 border-2 border-disco-cyan/50 dark:border-disco-cyan/60 bg-white dark:bg-slate-950 text-disco-dark-blue dark:text-white hover:border-disco-cyan/80 dark:hover:border-disco-cyan/80 transition-colors duration-200 font-normal text-sm lg:text-base"
          style="line-height: 1.5"
          aria-live="polite"
          @scroll="onScroll"
        >
          <!-- v-text rather than {{ }}: with `whitespace-pre-wrap` the
               template's own indentation would be rendered as spaces -->
          <span
            v-for="(segment, index) in segments"
            :key="index"
            :class="{
              'bg-disco-cyan/25 dark:bg-disco-cyan/30': segment.isGenerated,
            }"
            v-text="segment.text"
          />
          <span
            v-if="segments.length === 0"
            class="text-disco-dark-blue/50 dark:text-white/50"
            >Generation will appear here...</span
          >
        </div>

        <!-- Clear Button (Bottom Right) -->
        <button
          class="absolute bottom-3 right-3 p-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-disco-cyan hover:text-disco-cyan/80 transition-colors duration-200 focus:outline-none z-20"
          title="Clear Generation"
          :disabled="isGenerating"
          @click="clearGeneration()"
        >
          <CleanIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Input Field with Buttons -->
      <div class="lg:mx-10 xl:mx-12 mb-4 flex flex-col relative">
        <div class="relative">
          <!-- Input Field -->
          <input
            v-model="inputText"
            :disabled="isGenerating"
            type="text"
            class="w-full px-3 py-2.5 pr-20 rounded-lg border-2 border-disco-cyan/50 dark:border-disco-cyan/60 bg-white dark:bg-slate-950 text-disco-dark-blue dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-disco-cyan disabled:opacity-75 disabled:cursor-not-allowed hover:border-disco-cyan/80 dark:hover:border-disco-cyan/80 font-normal transition-all duration-200 text-sm lg:text-base"
            :class="{
              'text-disco-dark-blue/50 dark:text-disco-light-cyan/50':
                inputText.length === 0,
            }"
            placeholder="Enter text here..."
            @keydown.enter="
              (e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  generate();
                }
              }
            "
          />

          <!-- Right Side Buttons (Overlay) -->
          <div
            class="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2 z-20 pointer-events-auto"
          >
            <button
              class="p-2 rounded-lg text-disco-cyan hover:text-disco-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none"
              :disabled="!inputText.trim() && !isGenerating"
              :title="isGenerating ? 'Stop' : 'Generate'"
              @click="isGenerating ? stopGeneration() : generate()"
            >
              <MessageArrow v-if="!isGenerating" class="w-5 h-5" />
              <StopIcon v-else class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div class="sticky bottom-0 lg:mx-10 xl:mx-12 mb-4" />
    </div>

    <!-- Sidebar -->
    <div
      class="w-full lg:w-80 xl:w-96 bg-white dark:bg-slate-950 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6 m-0 lg:m-2 flex flex-col order-1 lg:order-2 max-h-none lg:max-h-none overflow-y-visible lg:overflow-y-visible"
    >
      <!-- Collapsible header for mobile -->
      <div class="lg:hidden">
        <button
          class="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4"
          @click="sidebarExpanded = !sidebarExpanded"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Model Parameters
          </h3>
          <svg
            :class="{
              'rotate-360': sidebarExpanded,
              'rotate-270': !sidebarExpanded,
            }"
            class="w-5 h-5 transform transition-transform duration-200 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <!-- Desktop header -->
      <h3
        class="hidden lg:block text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4"
      >
        Model Parameters
      </h3>

      <!-- Model Type Selector -->
      <div
        class="mb-6 p-4 bg-gradient-to-br from-disco-cyan/5 to-disco-cyan/10 dark:from-disco-cyan/10 dark:to-disco-cyan/20 border border-disco-cyan/30 dark:border-disco-cyan/40 rounded-lg"
      >
        <label
          class="block text-sm font-semibold text-disco-cyan dark:text-disco-cyan mb-3"
        >
          Model Type
        </label>
        <select
          v-model="selectedModelType"
          class="w-full px-4 py-2.5 border-2 border-disco-cyan/50 dark:border-disco-cyan/60 bg-white dark:bg-gray-900 text-disco-cyan dark:text-disco-cyan rounded-lg transition-all duration-200 hover:border-disco-cyan/80 dark:hover:border-disco-cyan/80 font-semibold"
        >
          <option
            value="tfjs-gpt2"
            class="bg-white dark:bg-gray-900 text-disco-cyan"
          >
            Tensorflow.js GPT2 (Uninitialized)
          </option>
          <option
            value="onnx-gpt2"
            class="bg-white dark:bg-gray-900 text-disco-cyan"
          >
            ONNX GPT2
          </option>
        </select>
      </div>

      <!-- Parameters section -->
      <div
        :class="{ hidden: !sidebarExpanded }"
        class="lg:block space-y-4 lg:space-y-6 flex-1"
      >
        <!-- Do Sample Checkbox -->
        <div class="mb-6">
          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              v-model="parameters.doSample"
              type="checkbox"
              class="w-4 h-4 accent-disco-cyan rounded"
            />
            <span
              class="text-sm lg:text-base font-medium text-gray-700 dark:text-gray-300"
            >
              Do Sample
            </span>
          </label>
          <p
            class="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-2 ml-7"
          >
            Enable sampling for more diverse predictions
          </p>
        </div>

        <!-- Temperature -->
        <div class="space-y-2 lg:space-y-3">
          <label
            class="block text-sm lg:text-base font-medium text-gray-700 dark:text-gray-300"
            :title="
              !parameters.doSample
                ? 'Disabled: Enable sampling to use this parameter'
                : ''
            "
          >
            Temperature
          </label>
          <div class="flex items-center space-x-2 lg:space-x-3 relative">
            <div
              v-if="!parameters.doSample"
              class="absolute inset-0 rounded-lg cursor-not-allowed group z-10"
              title="Enable sampling to use this parameter"
            >
              <div
                class="absolute inset-0 rounded-lg bg-transparent hover:bg-gray-400/5 transition-colors duration-200"
              />
            </div>
            <input
              v-model.number="parameters.temperature"
              type="range"
              min="0"
              max="2.0"
              step="0.1"
              :disabled="!parameters.doSample"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-disco-cyan"
            />
            <span
              class="text-sm lg:text-base text-gray-600 dark:text-gray-400 w-10 lg:w-12 text-right"
            >
              {{ parameters.temperature }}
            </span>
          </div>
          <p class="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
            Controls the randomness of the generation (0 = deterministic, 1.0 =
            creative)
          </p>
        </div>

        <!-- Top-k -->
        <div class="space-y-2 lg:space-y-3">
          <label
            class="block text-sm lg:text-base font-medium text-gray-700 dark:text-gray-300"
            :title="
              !parameters.doSample
                ? 'Disabled: Enable sampling to use this parameter'
                : ''
            "
          >
            Top-k
          </label>
          <div class="flex items-center space-x-2 lg:space-x-3 relative">
            <div
              v-if="!parameters.doSample"
              class="absolute inset-0 rounded-lg cursor-not-allowed group z-10"
              title="Enable sampling to use this parameter"
            >
              <div
                class="absolute inset-0 rounded-lg bg-transparent hover:bg-gray-400/5 transition-colors duration-200"
              />
            </div>
            <input
              v-model.number="parameters.topk"
              type="range"
              min="1"
              max="100"
              step="1"
              :disabled="!parameters.doSample"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-disco-cyan disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span
              class="text-sm lg:text-base text-gray-600 dark:text-gray-400 w-10 lg:w-12 text-right"
            >
              {{ parameters.topk }}
            </span>
          </div>
          <p class="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
            Consider only top-k most likely tokens
          </p>
        </div>

        <!-- Max Tokens -->
        <div class="space-y-2 lg:space-y-3">
          <label
            class="block text-sm lg:text-base font-medium text-gray-700 dark:text-gray-300"
          >
            Max Tokens
          </label>
          <div class="flex items-center space-x-2 lg:space-x-3">
            <input
              v-model.number="parameters.maxTokens"
              type="range"
              min="1"
              max="200"
              step="1"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-disco-cyan"
            />
            <span
              class="text-sm lg:text-base text-gray-600 dark:text-gray-400 w-10 lg:w-12 text-right"
            >
              {{ parameters.maxTokens }}
            </span>
          </div>
          <p class="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
            Maximum number of tokens to generate
          </p>
        </div>
      </div>

      <!-- Buttons -->
      <div
        :class="{ hidden: !sidebarExpanded }"
        class="lg:block flex gap-2 mt-4"
      >
        <div class="hidden lg:flex lg:gap-4 lg:justify-center">
          <CustomButton
            class="text-sm lg:text-base px-4 lg:px-6"
            @click="resetParameters()"
          >
            Reset
          </CustomButton>
          <CustomButton
            class="text-sm lg:text-base px-4 lg:px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isGenerating"
            @click="generate(true)"
          >
            Regenerate
          </CustomButton>
        </div>
        <div class="lg:hidden flex gap-2 justify-center">
          <CustomButton class="flex-1 text-sm px-4" @click="resetParameters()">
            Reset
          </CustomButton>
          <CustomButton
            class="flex-1 text-sm px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isGenerating"
            @click="generate(true)"
          >
            Regenerate
          </CustomButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import createDebug from "debug";
import {
  onMounted,
  onBeforeUnmount,
  computed,
  nextTick,
  ref,
  shallowRef,
  watch,
  reactive,
} from "vue";
import { useRoute } from "vue-router";
import MessageArrow from "@/assets/svg/MessageArrow.vue";
import StopIcon from "@/assets/svg/StopIcon.vue";
import { useModelsStore } from "@/store";
import { List } from "immutable";
import CustomButton from "@/components/simple/CustomButton.vue";
import CleanIcon from "@/assets/svg/CleanIcon.vue";
import type { GPT, GenerationConfig } from "@epfml/discojs";
import { ONNXModel, Tokenizer, DefaultGenerationConfig } from "@epfml/discojs";
import { useToaster } from "@/composables/toaster.js";

const debug = createDebug("webapp:testing:ChatUI");

const toaster = useToaster();

type LLMModel = GPT | ONNXModel;
type ModelType = "tfjs-gpt2" | "onnx-gpt2";
type ModelParameters = GenerationConfig & { maxTokens: number };
const DEFAULT_PARAMETERS: ModelParameters = {
  ...DefaultGenerationConfig,
  maxTokens: 50,
};
interface TextSegment {
  text: string;
  isGenerated: boolean;
}

const segments = ref<TextSegment[]>([]);
const textContent = computed(() =>
  segments.value.map(({ text }) => text).join(""),
);

const inputText = ref("");

const outputRef = ref<HTMLDivElement>();
// only follow the generation while the user hasn't scrolled up to read
const stickToBottom = ref(true);

function onScroll() {
  const output = outputRef.value;
  if (output === undefined) return;
  stickToBottom.value =
    output.scrollHeight - output.scrollTop - output.clientHeight < 16;
}

watch(textContent, async () => {
  if (!stickToBottom.value) return;
  await nextTick();
  const output = outputRef.value;
  if (output !== undefined) output.scrollTop = output.scrollHeight;
});

const modelsStore = useModelsStore();
const route = useRoute();
const modelID = Number(route.query.modelID);

const selectedModelType = ref<ModelType>(modelID ? "tfjs-gpt2" : "onnx-gpt2");
const llm = shallowRef<LLMModel | undefined>();
const tokenizer = shallowRef<Tokenizer | undefined>();

const sidebarExpanded = ref(false);
const isGenerating = ref(false);
const shouldStopGeneration = ref(false);

// create a copy because reactive mutates the object
const parameters = reactive<ModelParameters>({ ...DEFAULT_PARAMETERS });

function stopGeneration() {
  shouldStopGeneration.value = true;
}

function clearGeneration() {
  segments.value = [];
  stickToBottom.value = true;
}

async function getTokenizer(): Promise<Tokenizer> {
  if (tokenizer.value === undefined) {
    tokenizer.value = await Tokenizer.from_pretrained("Xenova/gpt2");
  }
  return tokenizer.value;
}

async function generate(isRegenerating: boolean = false) {
  const llmModel = llm.value;
  if (!llmModel) {
    toaster.error(
      `${selectedModelType.value.toUpperCase()} model is not loaded`,
    );
    return;
  }
  if (isRegenerating) {
    // drop the previous generation to generate again from the same prompt
    if (segments.value.at(-1)?.isGenerated) segments.value.pop();
    if (!textContent.value.trim()) return;
  } else if (!inputText.value.trim()) return;

  isGenerating.value = true;
  shouldStopGeneration.value = false;

  try {
    const tokenizer = await getTokenizer();
    if (!isRegenerating) {
      const prefix = textContent.value ? "\n" : "";
      segments.value.push({
        text: prefix + inputText.value.trim(),
        isGenerated: false,
      });
    }
    const promptTokens = tokenizer.tokenize(textContent.value.trim());
    const seed = isRegenerating ? 42 : undefined;
    await generateAndDecode(llmModel, tokenizer, promptTokens, seed);
  } catch (error) {
    debug("Error generating text:", error);
    toaster.error(`Failed to generate text`);
  } finally {
    isGenerating.value = false;
    shouldStopGeneration.value = false;
    inputText.value = "";
  }
}

async function generateAndDecode(
  llmModel: LLMModel,
  tokenizer: Tokenizer,
  tokens: List<number>,
  seed: number | undefined,
) {
  const predictionOptions: GenerationConfig = { ...parameters, seed };
  // appended to as tokens arrive, so that the highlight streams with the text
  const generatedIndex =
    segments.value.push({ text: "", isGenerated: true }) - 1;

  try {
    for (let n = 0; n < parameters.maxTokens; n++) {
      if (shouldStopGeneration.value) {
        break;
      }

      const next = (
        await llmModel.predict(List.of(tokens), predictionOptions)
      ).first();
      if (next === undefined) break;
      tokens = tokens.push(next);

      const decodedToken = tokenizer.decode([next]);
      if (decodedToken == "<|endoftext|>") break;
      // mutate through the ref: a reference to the pushed object isn't reactive
      segments.value[generatedIndex].text += decodedToken;
      // Let the UI update by preventing CPU hogging
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  } catch (error) {
    debug("Error predicting tokens:", error);
    toaster.error(`Failed to predict tokens`);
  } finally {
    // nothing was generated, e.g. stopped right away
    if (segments.value[generatedIndex].text === "")
      segments.value.splice(generatedIndex, 1);
  }
}

function resetParameters() {
  Object.assign(parameters, DEFAULT_PARAMETERS);
}

watch(
  () => parameters.doSample,
  (newValue) => {
    if (!newValue) {
      parameters.temperature = 0;
    } else {
      parameters.temperature = 1;
    }
  },
);

watch(
  () => parameters.temperature,
  (newValue) => {
    if (newValue === 0) {
      parameters.doSample = false;
    } else if (newValue > 0) {
      parameters.doSample = true;
    }
  },
);

onMounted(async () => loadModel());
onBeforeUnmount(() => llm.value?.dispose());

watch(
  () => selectedModelType.value,
  async () => loadModel(),
);

async function loadModel() {
  if (isGenerating.value) {
    toaster.error("Stop generation before changing model");
    return;
  }
  toaster.info("Loading the model...");
  try {
    llm.value?.dispose();
    switch (selectedModelType.value) {
      case "tfjs-gpt2":
        if (modelID) {
          llm.value = (await modelsStore.get(modelID)) as LLMModel;
          break;
        }
      case "onnx-gpt2":
        llm.value = await ONNXModel.init_pretrained("Xenova/gpt2");
        break;
      default:
        const _: never = selectedModelType.value;
    }
    if (!llm.value) throw new Error("model is undefined");
    toaster.success("Model loaded!");
  } catch (error) {
    toaster.error("An error occurred");
    debug("Error during model init:", error);
  }
}
</script>
