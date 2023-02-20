<template>
  <div>
    <div class="flex flex-wrap justify-center gap-8 my-2">
      <CustomButton
        type="button"
        class="basis-48"
        @click="() => router.push(`/contribute/upload`)"
      >
        Contribute Dataset
      </CustomButton>
    </div>
    <div
      id="datasets"
      class="flex flex-col gap-8 mt-8"
    >
      <div
        v-for="dataset in datasets"
        :id="dataset.id"
        :key="dataset.id"
      >
        <ButtonCard
          button-placement="left"
          @action="() => router.push(`/contribute/${dataset.id}`)"
        >
          <template
            #title
          >
            {{ dataset.title }}
          </template>
          <template #text>
            <div
              v-if="dataset.description !== undefined"
            >
              {{ dataset.description }}
            </div>
            <span
              v-else
              class="italic"
            >
              No description was provided by the dataset's contributor.
            </span>
          </template>
          <template #button>
            Details
          </template>
        </ButtonCard>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import ButtonCard from '@/components/containers/ButtonCard.vue'
import CustomButton from '../simple/CustomButton.vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '@/config'
import { data as discoData } from '@epfml/discojs'
import { onActivated, ref } from 'vue'

const router = useRouter()
const datasets = ref([])

onActivated(async () => {
  datasets.value = await getDatasets()
})

async function getDatasets (): Promise<any[]> {
  try {
    return await discoData.fetchDatasets(CONFIG.serverUrl)
  } catch (e) {
    console.error(
      'Fetching of datasets failed with error',
      e instanceof Error ? e.message : e.toString()
    )
  }
}

</script>
