<template>
  <div
    class="flex flex-col pt-4 items-right justify-start flex-1 h-full min-h-screen p-4 overflow-x-hidden overflow-y-auto"
  >
    <div>
      <DescriptionFrame
        v-bind:OverviewText="OverviewText"
        v-bind:LimitationsText="LimitationsText"
        v-bind:TradeOffsText="TradeOffsText"
        v-bind:Id="ModelId"
      />
    </div>
  </div>
</template>
<script>
import DescriptionFrame from "../Building Frames/DescriptionFrame";

export default {
  name: 'MainDescriptionFrame', 
  props: {
    Id: String,
    Task: Object,
  },
  data() {
    return {
      OverviewText: "",
      LimitationsText: "",
      TradeOffsText: "",
      ModelId: "",
    };
  },
  components: {
    DescriptionFrame,
  },
  mounted() {
    this.OverviewText = this.Task.display_information.overview;
    this.LimitationsText = this.Task.display_information.limitations;
    this.TradeOffsText = this.Task.display_information.tradeoffs;
    this.ModelId = this.Task.training_information.model_id;
  },
};
</script>