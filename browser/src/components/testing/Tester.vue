<template>
  <div>
    <ButtonCard
      class="mx-auto mt-10 w-1/2"
      :click="testModel"
      :button-placement="'center'"
    >
      <template #title>
        Test your model
      </template>
      <template #text>
        blablabla
      </template>
      <template #button>
        Test
      </template>
    </ButtonCard>
  </div>
</template>
<script lang="ts">
import ButtonCard from '@/components/containers/ButtonCard.vue'

import { isTask, GraphInformant } from 'discojs'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'Tester',
  components: {
    ButtonCard
  },
  props: {
    task: {
      validator: isTask,
      default: undefined
    }
  },
  data () {
    return {
      graph: new GraphInformant()
    }
  },
  methods: {
    testModel (): void {
      //
    }
  }
})
</script>
