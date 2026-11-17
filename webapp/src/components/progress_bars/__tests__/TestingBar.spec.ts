import { createTestingPinia } from "@pinia/testing";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";

import { useValidationStore } from "@/store";
import ProgressIcon from "../ProgressIcon.vue";
import TestingBar from "../TestingBar.vue";

enableAutoUnmount(afterEach);

it("keeps the heading without classification steps before model selection", () => {
  const wrapper = mount(TestingBar, {
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
  });

  expect(wrapper.get("h1").text()).toBe("Model Evaluation");
  expect(wrapper.findAllComponents(ProgressIcon)).toHaveLength(0);
});

it.each([
  ["test", "Model Testing", "Test Your Model"],
  ["predict", "Model Prediction", "Predict With Your Model"],
] as const)(
  "preserves %s navigation and hides steps on return to the library",
  async (mode, title, lastStep) => {
    const wrapper = mount(TestingBar, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: { validation: { step: 1, mode, modelID: 1 } },
          }),
        ],
      },
    });
    const validation = useValidationStore();

    expect(wrapper.get("h1").text()).toBe(title);
    const steps = wrapper.findAllComponents(ProgressIcon);
    expect(steps.map((step) => step.text())).toEqual([
      "Choose Model",
      "Connect Your Data",
      lastStep,
    ]);
    expect(steps[1].props("currentStep")).toBe(true);

    await steps[2].trigger("click");
    expect(validation.step).toBe(2);
    expect(steps[2].props("currentStep")).toBe(true);

    await steps[0].trigger("click");
    expect(validation.step).toBe(0);
    expect(wrapper.get("h1").text()).toBe("Model Evaluation");
    expect(wrapper.findAllComponents(ProgressIcon)).toHaveLength(0);
  },
);
