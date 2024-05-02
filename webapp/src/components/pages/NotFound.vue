<template>
  <div class="flex justify-center">
    <!-- Information sections -->
    <section class="flex-col items-center justify-center p-4 space-y-4 w-3/4">
      <div class="grid grid-cols-1 gap-4 p-4">
        <div
          class="
            group
            flex-col
            items-center
            justify-between
            p-4
            bg-white
            rounded-md
            dark:bg-darker
          "
        >
          <IconCard>
            <template #title>
              404 - Page Not Found
            </template>
            <template #content>
              The page you're looking for does not exist.
            </template>
          </IconCard>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import IconCard from '../containers/IconCard.vue'

export default defineComponent({
  name: 'NotFound',
  components: {
    IconCard
  }
})
</script>
