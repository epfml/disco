import { expect, it } from "vitest";
import { directive as Tippy } from "vue-tippy";
import { mount } from "@vue/test-utils";
import { List } from "immutable";

import type { BatchLogs, EpochLogs, RoundLogs } from "@epfml/discojs";

import TrainingInformation from "../TrainingInformation.vue";

it("shows messages", async () => {
  const wrapper = mount(TrainingInformation, {
    global: {
      directives: { Tippy },
      stubs: { apexchart: true },
    },
    props: {
      rounds: List<RoundLogs & { participants: number }>(),
      epochsOfRound: List<EpochLogs>(),
      numberOfEpochs: 30,
      batchesOfEpoch: List<BatchLogs>(),
      messages: List.of<string>("a", "b", "c"),
      hasValidationData: false,
      isTraining: true,
      isTrainingAlone: false
    },
  });

  expect(wrapper.findAll("#mapHeader li")).toHaveLength(3);
});
