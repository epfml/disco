<template>
  <BaseLayout custom-class="pt-4">
    <!-- Welcoming words -->
    <CustomHeader />
    <!-- TODO: This section is not algined with the top, not sure why -->
    <div class="grid grid-cols-2 gap-8">
      <section class="p-4">
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-1 xl:grid-cols-1">
          <div
            v-for="build in $tm('home.buildCard')"
            :key="build.header.text"
          >
            <TitleCard
              :title="build.header.text"
              :title-underlined="build.header.underlined"
            >
              <div
                v-for="item in build.items"
                :key="item"
              >
                <p v-html="`- ${item}`" />
              </div>
            </TitleCard>
          </div>
        </div>
      </section>
      <section class="flex-col items-center justify-center p-4 space-y-4">
        <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-1 xl:grid-cols-1">
          <div
            v-for="task in $tm('home.taskCard')"
            :key="task.header.text"
          >
            <TitleCard
              :title="task.header.text"
              :title-underlined="task.header.underlined"
            >
              <div
                v-for="item in task.items"
                :key="item"
              >
                <p v-html="`- ${item}`" />
              </div>
            </TitleCard>
          </div>
        </div>
      </section>
      <div class="">
        <CustomButton @click="goToTaskList()">
          {{ $t('home.startBuildingButtonText') }}
        </CustomButton>
      </div>
      <div class="">
        <CustomButton @click="goToNewTaskCreationForm()">
          {{ $t('home.createTaskButtonText') }}
        </CustomButton>
      </div>
      <!-- Decentralised insight -->
      <div class="flex flex-col items-center mx-auto">
        <TitleCard
          title="Insights: "
          :title-underlined="$t('home.images.decentralised.title')"
        >
          <div class="flex justify-center my-md">
            <DecentralizedImage class="sm:w-full md:w-3/5" />
          </div>
          <div>
            <span class="text-primary-dark dark:text-primary-light">{{
              $t('home.images.decentralised.title')
            }}</span>
            {{ $t('home.images.decentralised.text') }}
          </div>
        </TitleCard>
      </div>
      <!-- Federated insight -->
      <div class="flex flex-col items-center mx-auto">
        <TitleCard
          title="Insights: "
          :title-underlined="$t('home.images.federated.title')"
        >
          <div class="flex justify-center my-md">
            <FederatedImage class="sm:w-full md:w-3/5" />
          </div>
          <div>
            <span class="text-primary-dark dark:text-primary-light">{{
              $t('home.images.federated.title')
            }}</span>
            {{ $t('home.images.federated.text') }}
          </div>
        </TitleCard>
      </div>
    </div>
  </BaseLayout>
</template>

<script lang="ts">
import BaseLayout from '../containers/BaseLayout.vue'
import TitleCard from '../containers/TitleCard.vue'
import CustomHeader from '../simple/CustomHeader.vue'
import CustomButton from '../simple/CustomButton.vue'
import FederatedImage from '../../assets/svg/FederatedImage.vue'
import DecentralizedImage from '../../assets/svg/DecentralizedImage.vue'

export default {
  name: 'HomePage',
  components: {
    BaseLayout,
    TitleCard,
    CustomButton,
    FederatedImage,
    DecentralizedImage,
    CustomHeader
  },
  methods: {
    goToTaskList () {
      this.$router.push({
        path: '/list'
      })
    },
    goToNewTaskCreationForm () {
      this.$router.push({
        path: '/create'
      })
    }
  }
}
</script>
