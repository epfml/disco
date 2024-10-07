<template>
  <div class="flex flex-col gap-8">
    <div class="rounded-md py-2 px-4 bg-purple-200">
      <div class="flex flex-row flex-wrap justify-center gap-x-4 items-center">
        <InfoIcon custom-class="min-w-6 min-h-6 w-6 h-6 text-slate-600"/>
        <p class="text-slate-600 text-xs pt-1">Adding custom tasks is not available in this live demo.</p>
      </div>
    </div>

    <IconCard>
      <template #title><span>Create your own <DISCOllaborative /></span></template>

      <div>
        Fill in the fields below to create your own <DISCOllaborative />, and bring a new (arbitrary) ML task into Disco.
        Other users using the Disco client will be able to join your <DISCOllaborative />
        and contribute to its model, while keeping their data local and private.
      </div>
      <div>
        A <DISCOllaborative/> is made of two main elements:
        <div class="flex justify-left ml-10">
          <p>
            1. the <span class="font-bold">model</span>, any ML model built to be trained<br>
            2. the <span class="font-bold">task</span>, which defines how Disco will work with the model
          </p>
        </div>
      </div>
    </IconCard>
    <TaskForm />
  </div>
</template>

<script lang="ts" setup>
import TaskForm from '@/components/task_creation_form/TaskForm.vue'
import IconCard from '@/components/containers/IconCard.vue'
import DISCOllaborative from '@/components/simple/DISCOllaborative.vue'
import InfoIcon from "@/assets/svg/InfoIcon.vue";

</script>
