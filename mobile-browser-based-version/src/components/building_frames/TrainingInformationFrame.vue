<template>
  <div>
    <div
      x-transition:enter="transition duration-300 ease-in-out"
      x-transition:enter-start="opacity-0"
      x-transition:enter-end="opacity-100"
      x-ref="trainingBoard"
      x-show="isTraining"
    >
      <!-- Validation Accuracy users chart -->
      <div class="grid grid-cols-2 p-4 space-x-4 lg:gap-2">
        <div class="col-span-1 bg-white rounded-md dark:bg-darker">
          <!-- Card header -->
          <div class="p-4 border-b dark:border-primary">
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Validation Accuracy of the Model
            </h4>
          </div>
          <p class="p-4">
            <span class="text-2xl font-medium text-gray-500 dark:text-light">{{
              currentValidationAccuracy
            }}</span>
            <span class="text-sm font-medium text-gray-500 dark:text-primary"
              >% of validation accuracy</span
            >
          </p>
          <!-- Chart -->
          <div class="relative p-4 w-100% h-100%">
            <apexchart
              width="100%"
              height="200"
              type="area"
              :options="areaChartOptions"
              :series="validationAccuracyData"
            ></apexchart>
          </div>
        </div>

        <div class="col-span-1 bg-white rounded-md dark:bg-darker">
          <!-- Card header -->
          <div class="p-4 border-b dark:border-primary">
            <h4 class="text-lg font-semibold text-gray-500 dark:text-light">
              Training Accuracy of the Model
            </h4>
          </div>
          <p class="p-4">
            <span class="text-2xl font-medium text-gray-500 dark:text-light">{{
              currentTrainingAccuracy
            }}</span>
            <span class="text-sm font-medium text-gray-500 dark:text-primary"
              >% of training accuracy</span
            >
          </p>
          <!-- Chart -->
          <div class="relative p-4 w-100% h-100%">
            <apexchart
              width="100%"
              height="200"
              type="area"
              :options="areaChartOptions"
              :series="trainingAccuracyData"
            ></apexchart>
          </div>
        </div>
      </div>
    </div>

    <!-- Communication Console -->
    <icon-card header="Peer Training Console">
      <template v-slot:icon><contact /></template>
      <template v-slot:extra>
        <div id="mapHeader">
          <ul class="grid grid-cols-1 p-4">
            <li
              class="border-gray-400"
              v-for="(message, index) in trainingInformant.messages"
              :key="index"
            >
              <div class="relative overflow-x-hidden">
                <span
                  style="white-space: pre-line"
                  class="text-sm text-gray-500 dark:text-light"
                  >{{ message }}</span
                >
              </div>
            </li>
          </ul>
        </div>
      </template>
    </icon-card>

    <!-- Distributed Training Information -->
    <div class="grid grid-cols-1 gap-8 p-4 lg:grid-cols-2 xl:grid-cols-4">
      <!-- Number of time model updated with someone else's model card -->
      <icon-card-small
        header="# of Averaging"
        :description="String(trainingInformant.nbrUpdatesWithOthers)"
      >
        <performances />
      </icon-card-small>

      <!-- How much time I've been waiting for weights to arrive -->
      <icon-card-small
        header="Waiting Time"
        :description="`${trainingInformant.waitingTime} sec`"
        ><timer
      /></icon-card-small>

      <!-- Nbr. of Weight Requests -->
      <icon-card-small
        header="# Weight Requests"
        :description="String(trainingInformant.nbrWeightRequests)"
      >
        <forward />
      </icon-card-small>

      <!-- Nbr. of people helped -->
      <icon-card-small
        header="# of People Helped"
        :description="String(trainingInformant.whoReceivedMyModel.size)"
      >
        <people />
      </icon-card-small>
    </div>
  </div>
</template>

<script>
import IconCardSmall from '../containers/IconCardSmall.vue'
import IconCard from '../containers/IconCard.vue'
import Timer from '../../assets/svg/Timer.vue'
import People from '../../assets/svg/People.vue'
import Performances from '../../assets/svg/Performances.vue'
import Forward from '../../assets/svg/Forward.vue'
import Contact from '../../assets/svg/Contact.vue'

export default {
  components: {
    IconCardSmall,
    IconCard,
    Timer,
    People,
    Performances,
    Forward,
    Contact
  },
  name: 'TrainingInformationFrame',
  props: {
    trainingInformant: Object
  },
  data () {
    return {
      areaChartOptions: this.trainingInformant.getAreaChartOptions(),
      trainingAccuracyData: this.trainingInformant.getTrainingAccuracyData(),
      validationAccuracyData: this.trainingInformant.getValidationAccuracyData()
    }
  },

  computed: {
    displayHeatmap () {
      return this.trainingInformant.displayHeatmap
    },
    interoperabilityHeatmapData () {
      // TODO: cahnge once the peers exchange actual data of their weights and biases.
      return [
        {
          name: 'You',
          data: this.trainingInformant.weightsIn
        }
      ]
    },
    currentTrainingAccuracy () {
      return this.trainingInformant.currentTrainingAccuracy
    },
    currentValidationAccuracy () {
      return this.trainingInformant.currentValidationAccuracy
    }
  }
}
</script>
