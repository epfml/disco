<template>
  <div v-if="!verifyingRoute">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 py-6">
      <div
        class="text-center md:text-right"
      >
        <CustomButton
          @click="prevStepOrList()"
        >
          Previous
        </CustomButton>
      </div>
      <div
        class="text-center md:text-left"
      >
        <CustomButton
          v-show="step <= 3"
          @click="nextStep(id)"
        >
          Next
        </CustomButton>
      </div>
    </div>
    <Description
      v-show="step === 1"
      :task="task"
    />
    <Data
      v-show="step === 2"
      :task="task"
      :dataset-builder="datasetBuilder"
    />
    <Training
      v-show="step === 3"
      :task="task"
      :dataset-builder="datasetBuilder"
    />
    <Finished
      v-show="step === 4"
      :task="task"
    />
  </div>
</template>

<script lang="ts">
import { Task, dataset } from 'discojs'

import { defineComponent } from 'vue'
import { mapMutations, mapState } from 'vuex'

import { WebImageLoader, WebTabularLoader } from '@/data_loader'
import CustomButton from '@/components/simple/CustomButton.vue'
import Description from '@/components/Description.vue'
import Training from '@/components/training/Training.vue'
import Finished from '@/components/Finished.vue'
import Data from '@/components/data/Data.vue'

export default defineComponent({
  name: 'Navigation',
  components: {
    Description,
    Data,
    Training,
    Finished,
    CustomButton
  },
  props: {
    id: {
      type: String,
      default: ''
    }
  },
  data (): { verifyingRoute: boolean } {
    return {
      verifyingRoute: true
    }
  },
  computed: {
    ...mapState(['tasks', 'steps']),
    task (): Task {
      return this.tasks.get(this.id)
    },
    step (): number {
      return this.steps.get(this.id)
    },
    datasetBuilder (): dataset.DatasetBuilder<File> {
      let dataLoader: dataset.DataLoader<File>
      switch (this.task.trainingInformation.dataType) {
        case 'tabular':
          dataLoader = new WebTabularLoader(this.task, ',')
          break
        case 'image':
          dataLoader = new WebImageLoader(this.task)
          break
        default:
          throw new Error('not implemented')
      }
      return new dataset.DatasetBuilder(dataLoader, this.task)
    }
  },
  created () {
    if (!this.$store.state.tasks.has(this.id)) {
      this.$router.replace({ name: 'not-found' })
    } else {
      this.verifyingRoute = false
    }
  },
  mounted () {
    this.setStep({ taskID: this.id, step: 1 })
  },
  activated () {
    this.setCurrentTask(this.id)
  },
  methods: {
    ...mapMutations(['nextStep', 'prevStep', 'setStep', 'setCurrentTask']),
    prevStepOrList () {
      if (this.step === 1) {
        this.$router.push({ path: '/list' })
      } else {
        this.prevStep(this.id)
      }
    }
  }
})
</script>
