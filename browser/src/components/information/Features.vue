<template>
  <div>
    <!-- Why use Disco? / Features -->
    <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1 blue">
      <Card custom-class="hover:text-primary dark:hover:text-light">
        <h6
          class="
              text-xl
              font-large
              leading-none
              tracking-wider
              dark:group-hover:text-light
              px-2
              py-6
            "
        >
          {{ $tm('information.featuresTitle') }}
        </h6>
        <div class="ml-10">
          <Card
            v-for="card in $tm('information.featuresCard')"
            :key="(card as any).title"
            custom-class="hover:text-primary dark:hover:text-light"
          >
            <div class="ml-10">
              <ul
                class="text-lg ont-semibold text-gray-500 dark:text-light"
              >
                <b>{{ (card as any).title }}</b><br>
                {{
                  (card as any).text
                }}
              </ul>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Card from '@/components/containers/Card.vue'
// TODO fix i18n types
</script>
