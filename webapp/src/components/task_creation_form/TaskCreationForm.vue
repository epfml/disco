<template>
  <div class="flex flex-col gap-8">
    <TitleCard>
      <template #title>
        <div class="flex justify-center mb-4">
          <p>
            Create your own
            <span class="font-disco text-disco-cyan">DISCO</span>llaborative
          </p>
        </div>
      </template>
      <template #text>
        <div>
          <div>
            Fill in the fields below to create your own <DISCOllaborative />, and bring a new (arbitrary) ML task into Disco.
            Other users using the Disco client will be able to join your <DISCOllaborative />
            and contribute to its model, while keeping their data local and private.
          </div>
          <div>
            A <DISCOllaborative /> is made of two main elements:
            <div class="flex justify-center">
              <p>
                1. the <span class="font-bold">model</span>, any ML model built to be trained<br>
                2. the <span class="font-bold">task</span>, which defines how Disco will work with the model
              </p>
            </div>
          </div>
        </div>
      </template>
    </TitleCard>
    <TaskForm />
  </div>
</template>

<script lang="ts" setup>
import TaskForm from '@/components/task_creation_form/TaskForm.vue'
import TitleCard from '@/components/containers/TitleCard.vue'
import DISCOllaborative from '@/components/simple/DISCOllaborative.vue'
</script>
