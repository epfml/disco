<template>
  <div v-if="dataset">
    <div class="space-y-4 md:space-y-8">
      <IconCard>
        <template #title>
          Dataset information
        </template>
        <template
          #content
        >
          <div>
            {{ dataset.title }}
            <p>{{ dataset.description }}</p>
            <ul>
              <li><strong>Number of features: </strong> {{ dataset.columnCount }}</li>
              <li><strong>Number of data: </strong> {{ dataset.dataCount }}</li>
              <li><strong>Data type: </strong> {{ dataset.dataType }}</li>
              <li>
                <strong>Date added: </strong> {{ new Date(dataset.dateCreated).toLocaleString(undefined, {
                  calendar: "iso8601"
                }) }}
              </li>
            </ul>
          </div>
        </template>
      </IconCard>
      <ButtonCard
        button-placement="left"
        @action="async () => await loadSample()"
      >
        <template #title>
          Features
        </template>
        <template #text>
          <div
            class="font-bold grid grid-cols-4 gap-4"
          >
            <div>Feature</div>
            <div>
              Description
            </div>
            <div>
              Use as feature?
            </div>
            <div>
              Use as label?
            </div>
          </div>
          <div
            v-for="feature in dataset.features"
            :key="feature.id"
          >
            <div
              class="grid grid-cols-4 gap-4"
            >
              <div>{{ feature.name }}</div>
              <div>
                {{ feature.description }}
              </div>
              <div>
                {{ feature.allowFeature ? '✔️' : '❌' }}
              </div>
              <div>
                {{ feature.allowLabel ? '✔️' : '❌' }}
              </div>
            </div>
          </div>
        </template>
        <template #button>
          Load sample data
        </template>
      </ButtonCard>
      <IconCard v-if="sample">
        <template #title>
          Sample
        </template>
        <template
          #content
        >
          <table class="table-auto border-separate border-collapse text-sm text-left">
            <thead>
              <tr>
                <th
                  v-for="feature in sample.features"
                  :key="feature.name"
                  class="px-6"
                >
                  {{ feature.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="index in sample.features[0].values.length"
                :key="index"
              >
                <td
                  v-for="value in sample.features.map(x => x.values[index-1])"
                  :key="value"
                  class="px-6"
                >
                  {{ value }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </IconCard>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, defineProps } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '@/config'
import { data } from '@epfml/discojs'

import IconCard from '@/components/containers/IconCard.vue'
import ButtonCard from '../containers/ButtonCard.vue'

const router = useRouter()

// task ID given by the route
interface Props { id: string }
const props = defineProps<Props>()

const dataset = ref(null)
const sample = ref(null)

onMounted(async () => {
  dataset.value = await getDataset(props.id)
  if (!dataset.value) {
    router.replace({ name: 'not-found' })
  }
})

async function getDataset (id: string): Promise<any> {
  try {
    return await data.fetchDataset(CONFIG.serverUrl, id)
  } catch (e) {
    console.error(
      'Fetching of dataset failed with error',
      e instanceof Error ? e.message : e.toString()
    )
  }
}

async function loadSample (): Promise<void> {
  sample.value = await data.fetchSample(CONFIG.serverUrl, props.id)
}
</script>
