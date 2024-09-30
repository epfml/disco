<template>
    <!-- Page Content -->
    <Card class="flex flex-col place-content-center p-4 space-y-6 rounded-xl ">
      <p class="flex flex-wrap justify-center text-2xl text-slate-400 dark:text-slate-300 mt-2">
        <span><span class="font-disco text-disco-cyan dark:text-disco-light-cyan uppercase">dis</span><span>tributed</span>&nbsp;</span>
        <span><span class="font-disco text-disco-blue uppercase">co</span><span>llaborative learning platform</span></span>
      </p>
      <div class="grid gap-8 p-4 sm:grid-cols-2 text-slate-400 border-t">
        <!-- Federated insight -->
        <div class="flex flex-col items-center">
          <h6
            class="
              text-center
              text-2xl
              leading-none
              tracking-wider
              px-2
              py-6
            "
          >
            Federated Learning
          </h6>
          <FederatedGIF class="my-md bg-slate-100 rounded-lg border-slate-300 border-4" />
          <p class="text-sm py-6 text-center">
            The server puts in common local model updates and sends back an aggregated global model. <br/>No data is shared.
          </p>
        </div>
        <!-- Decentralised insight -->
        <div class="flex flex-col items-center">
          <h6
            class="
              text-center
              text-2xl
              leading-none
              tracking-wider
              px-2
              py-6
            "
          >
            Decentralized Learning
          </h6>
          <DecentralizedGIF class="my-md bg-slate-100 rounded-lg border-slate-300 border-4" />
          <p class="text-sm py-6 text-center">
            Local model aggregation is coordinated between peers without any server.
            <br/> No data is shared.
          </p>
        </div>
      </div>
    </Card>
</template>

<script lang="ts" setup>
import { onActivated } from 'vue'

import { useInformationStore } from '@/store/information'
import Card from '@/components/containers/Card.vue'
import DecentralizedGIF from '@/assets/gif/DecentralizedGIF.vue'
import FederatedGIF from '@/assets/gif/FederatedGIF.vue'

const informationStore = useInformationStore()
onActivated(() => { informationStore.step = 0 })
</script>
