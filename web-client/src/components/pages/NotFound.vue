<template>
  <div>
    <!-- Welcoming words -->
    <CustomHeader />
    <!-- Information sections -->
    <section class="flex-col items-center justify-center p-4 space-y-4">
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
          <TitleCard>
            <template #title>
              404 - Page Not Found
            </template>
            <template #text>
              The page you're looking for does not exist.
              <div class="grid grid-cols-2 gap-8 items-center">
                <div class="text-right">
                  <CustomButton
                    @click="goToPreviousPage()"
                  >
                    Go Back
                  </CustomButton>
                </div>
                <div class="text-left">
                  <CustomButton
                    @click="goToHomePage()"
                  >
                    Home Page
                  </CustomButton>
                </div>
              </div>
            </template>
          </TitleCard>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import CustomButton from '../simple/CustomButton.vue'
import CustomHeader from '../simple/CustomHeader.vue'
import TitleCard from '../containers/TitleCard.vue'

export default defineComponent({
  name: 'NotFound',
  components: {
    CustomButton,
    CustomHeader,
    TitleCard
  },
  methods: {
    goToPreviousPage () {
      this.$router.go(-1)
    },
    goToHomePage () {
      this.$router.push({ path: '/' })
    }
  }
})
</script>
