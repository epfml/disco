<template>
  <div>
    <!-- Page Content -->
    <Card class="flex flex-col place-content-center p-6 space-y-6">
      <p class="flex flex-wrap justify-center text-3xl text-slate-400 mt-2">
        <span><span class="font-disco text-disco-blue uppercase">Dis</span><span>-tributed</span>&nbsp;</span>
        <span><span class="font-disco text-disco-cyan uppercase">Co</span><span>-llaborative</span>&nbsp;</span>
        learning platform
      </p>
      <div class="grid gap-8 p-4 sm:grid-cols-2 text-slate-500">
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
          <FederatedGIF class="my-md" />
          <p class="text-lg py-6">
            - Server coordinates secure collaborative learning of model
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
          <DecentralizedGIF class="my-md" />
          <p class="text-lg py-6">
            - Peer2Peer secure collaborative learning of model
          </p>
        </div>
      </div>
      <div class="flex w-full md:w-1/2 justify-center rounded-3xl bg-disco-cyan">
        <ul class="text-lg ont-semibold text-white">
          <div
            class="py-6"
          >
            <p>- Data stays local, always</p>
            <p>- Secure and privacy preserving</p>
            <p>- Collaborative training</p>
          </div>
        </ul>
      </div>
    </Card>
  </div>
</template>

<script lang="ts" setup>
import Card from '@/components/containers/Card.vue'
import DecentralizedGIF from '@/assets/gif/DecentralizedGIF.vue'
import FederatedGIF from '@/assets/gif/FederatedGIF.vue'
</script>
