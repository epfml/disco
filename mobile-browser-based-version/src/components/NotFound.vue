<template>
  <base-layout customClass="pt-4">
    <!-- Welcoming words -->
    <custom-header />
    <!-- Information sections -->
    <section class="flex-col items-center justify-center p-4 space-y-4">
      <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
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
          <title-card title="Page Not Found">
            <p class="text-base">
              The page you asked for does not exist anymore.
            </p>
          </title-card>
        </div>

        <div class="flex items-center justify-center p-4">
          <custom-button @click="goToPreviousPage()" :center="true">
            Go Back
          </custom-button>
          <custom-button @click="goToHomePage()" :center="true">
            Home Page
          </custom-button>
        </div>
      </div>
    </section>
  </base-layout>
</template>

<script>
import { defineComponent } from 'vue'
import BaseLayout from './containers/BaseLayout.vue';
import CustomButton from './simple/CustomButton.vue';
import CustomHeader from './simple/CustomHeader.vue';
import TitleCard from './containers/TitleCard.vue';

export default defineComponent({
  name: 'not-found',
  components: {
    BaseLayout,
    CustomButton,
    CustomHeader,
    TitleCard,
  },
  methods: {
    goToPreviousPage () {
      this.$router.go(-1)
    },
    goToHomePage () {
      this.$router.push({ name: 'home' })
    }
  }
})
</script>
