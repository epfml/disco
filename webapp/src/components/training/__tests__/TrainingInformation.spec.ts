import { expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { List } from "immutable";

import type { BatchLogs, EpochLogs, RoundLogs } from "@epfml/discojs";

import TrainingInformation from "../TrainingInformation.vue";

it("shows messages", async () => {
  const wrapper = mount(TrainingInformation, {
    global: { stubs: { apexchart: true } },
    props: {
      rounds: List<RoundLogs & { participants: number }>(),
      epochsOfRound: List<EpochLogs>(),
      batchesOfEpoch: List<BatchLogs>(),
      messages: List.of<string>("a", "b", "c"),
      hasValidationData: false,
    },
  });

  expect(wrapper.findAll("#mapHeader li")).toHaveLength(3);
});
