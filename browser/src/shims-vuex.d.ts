import store from '@/store'

declare module '@vue/runtime-core' {
    // Vuex doesn't provide typings for this.$store property out of the box.
    // When used with TypeScript, you must declare your own module augmentation:
    // https://next.vuex.vuejs.org/guide/typescript-support.html

    // Better to use some sort of interface

    // eslint-disable-next-line no-unused-vars
    interface ComponentCustomProperties {
      $store: typeof store
    }
  }
