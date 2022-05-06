<template>
  <BaseLayout>
    <!-- Welcoming words -->
    <Disco class="mx-auto" />
    <CustomHeader class="my-4" />
    <!-- TODO: This section is not algined with the top, not sure why -->
    <div class="grid grid-cols-2 gap-8 items-stretch">
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
            <div class="text-center pt-8">
              <CustomButton @click="goToTaskList()">
                {{ $t('home.startBuildingButtonText') }}
              </CustomButton>
            </div>
          </TitleCard>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-1 xl:grid-cols-1">
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
            <div class="text-center pt-8">
              <CustomButton @click="goToNewTaskCreationForm()">
                {{ $t('home.createTaskButtonText') }}
              </CustomButton>
            </div>
          </TitleCard>
        </div>
      </div>
    </div>
  </BaseLayout>
</template>

<script lang="ts">
import BaseLayout from '@/components/containers/BaseLayout.vue'
import TitleCard from '@/components/containers/TitleCard.vue'
import CustomHeader from '@/components/simple/CustomHeader.vue'
import CustomButton from '@/components/simple/CustomButton.vue'
import Disco from '@/assets/svg/Disco.vue'

export default {
  name: 'HomePage',
  components: {
    BaseLayout,
    TitleCard,
    CustomButton,
    Disco,
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
