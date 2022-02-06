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
          v-if="task.displayInformation.tradeoffs"
          :overviewText="task.displayInformation.overview"
          :modelText="task.displayInformation.model"
          :tradeOffsText="task.displayInformation.tradeoffs"
          :id="task.taskID"
          :task="task"
        />
      </keep-alive>
    </div>
  </div>
</template>
<script>
import DescriptionFrame from '../building_frames/DescriptionFrame.vue';

export default {
  name: 'main-description-frame',
  props: {
    id: String,
    task: Object,
  },
  components: {
    DescriptionFrame,
  },
};
</script>
