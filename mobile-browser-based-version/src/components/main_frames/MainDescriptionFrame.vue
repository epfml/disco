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
          v-bind:Task="Task"
          v-if="TradeOffsText"
        />
      </keep-alive>
    </div>
  </div>
</template>
<script>
import DescriptionFrame from '../building_frames/DescriptionFrame';

export default {
  name: 'main-description-frame',
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      OverviewText: '',
      ModelText: '',
      TradeOffsText: '',
      taskID: '',
      modelID: '',
    };
  },
  components: {
    DescriptionFrame,
  },
  mounted() {
    this.OverviewText = this.Task.displayInformation.overview;
    this.ModelText = this.Task.displayInformation.model;
    this.TradeOffsText = this.Task.displayInformation.tradeoffs;
    this.taskID = this.Task.taskID;
    this.modelID = this.Task.trainingInformation.modelID;
  },
};
</script>
