<template>
  <div class="flex flex-col gap-8">
    <Card custom-class="py-2 px-4 bg-orange-100">
      <div class="flex flex-row flex-wrap justify-between gap-x-4 items-center">
        <p class="text-slate-600 text-xs">Adding custom tasks is currently not available and will be supported in a future release!</p>
        <a target="_blank"
        href="https://framaforms.org/disco-feedback-form-1718716636"
        >
          <div class="flex flex-row flex-wrap items-center gap-x-2 justify-end">
            <p class="text-disco-blue font-bold text-xs hover:underline hover:text-disco-cyan text-end">Give us some feedback</p>
            <FeedbackIcon custom-class="min-w-8 min-h-8 w-8 h-8"/>
          </div>
        </a>
      </div>
    </Card>
    <IconCard>
      <template #title>
        Create your own <DISCOllaborative/>
      </template>
      <template #content>
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
      </template>
    </IconCard>
    <TaskForm />
  </div>
</template>

<script lang="ts" setup>
import TaskForm from '@/components/task_creation_form/TaskForm.vue'
import IconCard from '@/components/containers/IconCard.vue'
import Card from "@/components/containers/Card.vue";
import DISCOllaborative from '@/components/simple/DISCOllaborative.vue'
import FeedbackIcon from "@/assets/svg/FeedbackIcon.vue";

</script>
