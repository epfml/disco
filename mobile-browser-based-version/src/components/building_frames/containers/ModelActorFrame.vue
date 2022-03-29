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
    <!-- Data Format Card -->
    <a id="overview-target">
      <icon-card
        header="Data Format Information"
        :description="dataFormatInfoText"
      >
        <template #icon><check-list /></template>
      </icon-card>
    </a>

    <!-- Data Example Card -->
    <a id="limitations-target">
      <icon-card
        header="Data Example"
        :description="dataExampleText"
        :with-toggle="true"
      >
        <template #icon><file-earmark-ruled /></template>
        <!-- Data Point Example -->
        <template #extra>
          <slot name="dataExample" />
        </template>
      </icon-card>
    </a>
    <slot name="action" />
  </div>
</template>

<script>
import IconCard from '../../containers/IconCard.vue'
import CheckList from '../../../assets/svg/CheckList.vue'
import FileEarmarkRuled from '../../../assets/svg/FileEarmarkRuled.vue'

export default {
  name: 'ModelActorFrame',
  components: {
    IconCard,
    CheckList,
    FileEarmarkRuled
  },
  props: {
    task: Object
  },
  data () {
    return {
      // variables for general informations
      dataFormatInfoText: '',
      dataExampleText: ''
    }
  },
  async mounted () {
    // This method is called when the component is created
    this.$nextTick(async function () {
      // initialize information variables
      this.dataFormatInfoText =
        this.task.displayInformation.dataFormatInformation
      this.dataExampleText = this.task.displayInformation.dataExampleText
      console.log(`Mounting ${this.task.trainingInformation.modelID}`)
    })
  }
}
</script>
