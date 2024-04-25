import { expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { List } from "immutable";

import type { RoundLogs } from "@epfml/discojs-core";

import TrainingInformation from "../TrainingInformation.vue";

it("shows messages", async () => {
  const wrapper = mount(TrainingInformation, {
    global: {
      mocks: {
        $t: (text: string) => text,
      },
      stubs: {
        apexchart: true,
      },
    },
    props: {
      logs: List<RoundLogs & { participants: number }>(),
      messages: List.of<string>("a", "b", "c"),
      hasValidationData: false,
    },
  });

  expect(wrapper.findAll("#mapHeader li")).toHaveLength(3);
});
