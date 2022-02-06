<template>
  <div
    class="
      flex flex-col
      pt-4
      items-right
      justify-start
      flex-1
      h-full
      min-h-screen
      p-4
      overflow-x-hidden overflow-y-auto
    "
  >
    <div>
      <keep-alive>
        <description-frame
          v-bind:OverviewText="OverviewText"
          v-bind:ModelText="ModelText"
          v-bind:TradeOffsText="TradeOffsText"
          v-bind:Id="taskID"
          v-bind:task="task"
          v-if="TradeOffsText"
        />
      </keep-alive>
    </div>
  </div>
</template>
<script>
import DescriptionFrame from "../building_frames/DescriptionFrame.vue";

export default {
  name: "main-description-frame",
  props: {
    id: String,
    task: Object,
  },
  data() {
    return {
      OverviewText: "",
      ModelText: "",
      TradeOffsText: "",
      taskID: "",
      modelID: "",
    };
  },
  components: {
    DescriptionFrame,
  },
  mounted() {
    this.OverviewText = this.task.displayInformation.overview;
    this.ModelText = this.task.displayInformation.model;
    this.TradeOffsText = this.task.displayInformation.tradeoffs;
    this.taskID = this.task.taskID;
    this.modelID = this.task.trainingInformation.modelID;
  },
};
</script>
