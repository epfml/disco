<template>
  <div class="flex h-full flex-col lg:flex-row">
    <!-- Main Content -->
    <div class="flex flex-col flex-1 order-2 lg:order-1">
      <div class="mx-4 sm:mx-6 md:mx-8 lg:mx-10 xl:mx-12 mt-2">
        <p
          class="font-disco text-xl lg:text-2xl font-bold text-heading-light dark:text-heading-dark"
        >
          Experiment with text completion — discover how language models predict
          the next word
        </p>
      </div>

      <!-- Display Textarea (Read-only) -->
      <div
        class="flex-1 mx-4 sm:mx-6 md:mx-8 lg:mx-10 xl:mx-12 my-4 flex flex-col relative"
      >
        <!-- Highlight overlay -->
        <div
          ref="highlightOverlayRef"
          class="absolute top-0 left-0 rounded-lg p-3 pointer-events-none overflow-y-auto text-sm lg:text-base text-transparent font-normal z-10"
          style="
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.5;
            font-family: inherit;
            width: calc(100% - 1.5rem);
            max-width: 100%;
          "
        >
          <template v-for="(segment, index) in textSegments" :key="index">
            <span v-if="!segment.isGenerated" class="text-transparent">{{
              segment.text
            }}</span>
            <span v-else class="bg-disco-cyan text-transparent">{{
              segment.text
            }}</span>
          </template>
        </div>

        <textarea
          v-model="textContent"
          :disabled="true"
          ref="textareaRef"
          @scroll="syncScroll"
          class="w-full h-full min-h-[300px] lg:min-h-0 rounded-lg p-3 border-2 border-disco-cyan/50 dark:border-disco-cyan/60 bg-white dark:bg-gray-900 text-disco-dark-blue dark:text-white resize-none focus:outline-none focus:ring-1 focus:ring-disco-cyan overflow-y-auto disabled:opacity-75 disabled:cursor-not-allowed relative z-20 hover:border-disco-cyan/80 dark:hover:border-disco-cyan/80 font-normal transition-all duration-200 text-sm lg:text-base cursor-default"
          :class="{
            'text-disco-dark-blue/50 dark:text-white/50':
              textContent.length === 0,
          }"
          placeholder="Text will appear here..."
          style="line-height: 1.5"
        />

        <!-- Clear Button (Bottom Right) -->
        <button
          @click="clearTextarea()"
          class="absolute bottom-3 right-3 p-2 rounded-lg text-disco-cyan hover:text-disco-cyan/80 transition-colors duration-200 focus:outline-none z-20"
          title="Clear textarea"
        >
          <CleanIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Input Field with Buttons -->
      <div
        class="mx-4 sm:mx-6 md:mx-8 lg:mx-10 xl:mx-12 mb-4 flex flex-col relative"
      >
        <div class="relative">
          <!-- Input Field -->
          <input
            v-model="inputText"
            :disabled="isGenerating"
            @keydown.enter="
              (e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  addClickToTextarea();
                }
              }
            "
            type="text"
            class="w-full px-3 py-2.5 pr-20 rounded-lg border-2 border-disco-cyan/50 dark:border-disco-cyan/60 bg-white dark:bg-gray-900 text-disco-dark-blue dark:text-disco-light-cyan resize-none focus:outline-none focus:ring-1 focus:ring-disco-cyan disabled:opacity-75 disabled:cursor-not-allowed hover:border-disco-cyan/80 dark:hover:border-disco-cyan/80 font-normal transition-all duration-200 text-sm lg:text-base"
            :class="{
              'text-disco-dark-blue/50 dark:text-disco-light-cyan/50':
                inputText.length === 0,
            }"
            placeholder="Enter text here..."
          />

          <!-- Right Side Buttons (Overlay) -->
          <div
            class="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2 z-20 pointer-events-auto"
          >
            <button
              @click="isGenerating ? stopGeneration() : addClickToTextarea()"
              :disabled="!inputText.trim() && !isGenerating"
              class="p-2 rounded-lg text-disco-cyan hover:text-disco-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none"
              :title="isGenerating ? 'Stop' : 'Generate'"
            >
              <MessageArrow v-if="!isGenerating" class="w-5 h-5" />
              <StopIcon v-else class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        class="sticky bottom-0 mx-4 sm:mx-6 md:mx-8 lg:mx-10 xl:mx-12 mb-4"
      />
    </div>

    <!-- Sidebar -->
    <div
      class="w-full lg:w-80 xl:w-96 bg-gray-50 dark:bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 rounded-none lg:rounded-xl p-4 sm:p-6 m-0 lg:m-2 flex flex-col order-1 lg:order-2 max-h-[40vh] lg:max-h-none overflow-y-auto lg:overflow-y-visible"
    >
      <!-- Collapsible header for mobile -->
      <div class="lg:hidden">
        <button
          @click="sidebarExpanded = !sidebarExpanded"
          class="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Model Parameters
          </h3>
          <svg
            :class="{ 'rotate-180': sidebarExpanded }"
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
        class="hidden lg:block text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6"
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
          <option value="gpt" class="bg-white dark:bg-gray-900 text-disco-cyan">
            GPT Model
          </option>
          <option
            value="onnx"
            class="bg-white dark:bg-gray-900 text-disco-cyan"
          >
            ONNX Model
          </option>
        </select>
      </div>

      <!-- Parameters section -->
      <div
        :class="{ hidden: !sidebarExpanded }"
        class="lg:block space-y-4 lg:space-y-6 flex-1"
      >
        <!-- Temperature -->
        <div class="space-y-2 lg:space-y-3">
          <label
            class="block text-sm lg:text-base font-medium text-gray-700 dark:text-gray-300"
          >
            Temperature
          </label>
          <div class="flex items-center space-x-2 lg:space-x-3">
            <input
              type="range"
              v-model.number="parameters.temperature"
              min="0"
              max="2.0"
              step="0.1"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-disco-cyan"
            />
            <span
              class="text-sm lg:text-base text-gray-600 dark:text-gray-400 w-10 lg:w-12 text-right"
            >
              {{ parameters.temperature }}
            </span>
          </div>
          <p class="text-xs lg:text-sm text-gray-500 dark:text-gray-400">
            Controls randomness in generation (0 = focused, 2.0 = creative)
          </p>
        </div>

        <!-- Do Sample Checkbox -->
        <div class="mb-6">
          <label class="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              v-model="parameters.doSample"
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
              :title="'Enable sampling to use this parameter'"
            >
              <div
                class="absolute inset-0 rounded-lg bg-transparent hover:bg-gray-400/5 transition-colors duration-200"
              />
            </div>
            <input
              type="range"
              v-model="parameters.topK"
              min="1"
              max="100"
              step="1"
              :disabled="!parameters.doSample"
              class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-disco-cyan disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span
              class="text-sm lg:text-base text-gray-600 dark:text-gray-400 w-10 lg:w-12 text-right"
            >
              {{ parameters.topK }}
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
              type="range"
              v-model="parameters.maxTokens"
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
            @click="resetParameters()"
            class="text-sm lg:text-base px-4 lg:px-6"
          >
            Reset
          </CustomButton>
          <CustomButton
            @click="regenerateText()"
            class="text-sm lg:text-base px-4 lg:px-6"
          >
            Regenerate
          </CustomButton>
        </div>
        <div class="lg:hidden flex gap-2 justify-center">
          <CustomButton @click="resetParameters()" class="flex-1 text-sm px-4">
            Reset
          </CustomButton>
          <CustomButton @click="regenerateText()" class="flex-1 text-sm px-4">
            Regenerate
          </CustomButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup generic="D extends DataType">
import { onMounted, ref, shallowRef, watch, reactive, computed } from "vue";
import { useRoute } from "vue-router";
import type { Model, DataType } from "@epfml/discojs";
import MessageArrow from "@/assets/svg/MessageArrow.vue";
import StopIcon from "@/assets/svg/StopIcon.vue";
import { useModelsStore } from "@/store";
import { Tokenizer } from "@epfml/discojs";
import { List } from "immutable";
import { models } from "@epfml/discojs";
import CustomButton from "@/components/simple/CustomButton.vue";
import CleanIcon from "@/assets/svg/CleanIcon.vue";

interface ModelParameters {
  temperature: number;
  topK: number;
  maxTokens: number;
  doSample: boolean;
}

interface TextSegment {
  text: string;
  isGenerated: boolean;
}

const textareaRef = ref<HTMLTextAreaElement>();
const highlightOverlayRef = ref<HTMLDivElement>();

const syncScroll = () => {
  if (textareaRef.value && highlightOverlayRef.value) {
    highlightOverlayRef.value.scrollTop = textareaRef.value.scrollTop;
    highlightOverlayRef.value.scrollLeft = textareaRef.value.scrollLeft;
  }
};

const textSegments = ref<TextSegment[]>([]);
const textContent = ref("");
const inputText = ref("");
const lastUserInput = ref("");
const modelsStore = useModelsStore();
const model = shallowRef<models.GPT | null>(null);
const onnxModel = shallowRef<models.ONNXModel | null>(null);
const route = useRoute();
const sidebarExpanded = ref(false);
const selectedModelType = ref<"gpt" | "onnx">("gpt");
const isGenerating = ref(false);
const shouldStopGeneration = ref(false);

const tokenizer = ref<Tokenizer | null>(null);

const parameters = reactive<ModelParameters>({
  temperature: 1.0,
  topK: 50,
  maxTokens: 50,
  doSample: true,
});

const stopGeneration = () => {
  shouldStopGeneration.value = true;
  isGenerating.value = false;
};

const clearInput = () => {
  inputText.value = "";
};

const clearTextarea = () => {
  textContent.value = "";
  textSegments.value = [];
  lastUserInput.value = "";
};

const addClickToTextarea = async () => {
  if (!inputText.value.trim()) return;

  try {
    isGenerating.value = true;
    shouldStopGeneration.value = false;

    const prefix = textContent.value ? "\n" : "";
    textContent.value += prefix + inputText.value.trim();

    textSegments.value.push({
      text: prefix + inputText.value.trim(),
      isGenerated: false,
    });

    const tokenizer = await Tokenizer.from_pretrained("Xenova/gpt2");
    let tokens = tokenizer.tokenize(textContent.value.trim());

    const selectedModel =
      selectedModelType.value === "gpt" ? model.value : onnxModel.value;

    if (!selectedModel) {
      textContent.value += `\nError: ${selectedModelType.value.toUpperCase()} model not loaded`;
      return;
    }

    try {
      lastUserInput.value = textContent.value.trim();
      let generatedToken = "";

      const predictionOptions = {
        temperature: parameters.temperature,
        topK: parameters.topK,
      };

      for (let n = 0; n < parameters.maxTokens; n++) {
        if (shouldStopGeneration.value) {
          break;
        }

        const next = (
          await selectedModel.predict(List.of(tokens), predictionOptions)
        ).first();

        if (next === undefined) {
          break;
        }
        tokens = tokens.push(next);

        const decodedToken = tokenizer.decode([next]);
        textContent.value += decodedToken;
        generatedToken += decodedToken;
      }

      if (generatedToken) {
        textSegments.value.push({
          text: generatedToken,
          isGenerated: true,
        });
      }
    } catch (error) {
      console.error("Error predicting tokens:", error);
      textContent.value += `\nError: Failed to predict tokens`;
    }
  } catch (error) {
    console.error("Error tokenizing:", error);
    textContent.value += `\nError: Failed to tokenize text`;
  } finally {
    isGenerating.value = false;
    shouldStopGeneration.value = false;
    inputText.value = "";
    if (textareaRef.value) {
      textareaRef.value.scrollTop = textareaRef.value.scrollHeight;
    }
  }
};

const regenerateText = async () => {
  const selectedModel =
    selectedModelType.value === "gpt" ? model.value : onnxModel.value;

  if (!selectedModel) {
    console.error(`${selectedModelType.value.toUpperCase()} model not loaded`);
    return;
  }

  if (!lastUserInput.value.trim()) {
    console.warn("No previous input to regenerate from");
    return;
  }

  try {
    isGenerating.value = true;
    shouldStopGeneration.value = false;

    const tokenizer = await Tokenizer.from_pretrained("Xenova/gpt2");
    textContent.value = lastUserInput.value;

    if (textSegments.value[textSegments.value.length - 1]?.isGenerated) {
      textSegments.value.pop();
    }

    let tokens = tokenizer.tokenize(lastUserInput.value.trim());
    let generatedToken = "";

    const predictionOptions = {
      temperature: parameters.temperature,
      topK: parameters.topK,
    };

    for (let n = 0; n < parameters.maxTokens; n++) {
      if (shouldStopGeneration.value) {
        break;
      }

      const next = (
        await selectedModel.predict(List.of(tokens), predictionOptions)
      ).first();

      if (next === undefined) {
        break;
      }
      tokens = tokens.push(next);

      const decodedToken = tokenizer.decode([next]);
      textContent.value += decodedToken;
      generatedToken += decodedToken;
    }

    if (generatedToken) {
      textSegments.value.push({
        text: generatedToken,
        isGenerated: true,
      });
    }
  } catch (error) {
    console.error("Error regenerating text:", error);
    textContent.value += `\nError: Failed to regenerate text`;
  } finally {
    isGenerating.value = false;
    shouldStopGeneration.value = false;
    if (textareaRef.value) {
      textareaRef.value.scrollTop = textareaRef.value.scrollHeight;
    }
  }
};

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

const resetParameters = () => {
  parameters.temperature = 1.0;
  parameters.topK = 50;
  parameters.maxTokens = 50;
};

onMounted(async () => {
  const modelID = Number(route.query.modelID);
  const loadedModel = await modelsStore.get(modelID);
  if (loadedModel !== undefined) {
    model.value = loadedModel as models.GPT;
  }

  onnxModel.value = await models.ONNXModel.init_pretrained("Xenova/gpt2");
});

const generatedText = computed(() => {
  return textContent.value.slice(lastUserInput.value.length);
});
</script>
