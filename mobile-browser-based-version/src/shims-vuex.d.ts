import { Store } from '@/store/store'// path to store file

declare module '@vue/runtime-core' {
    // Vuex doesn't provide typings for this.$store property out of the box.
    // When used with TypeScript, you must declare your own module augmentation:
    // https://next.vuex.vuejs.org/guide/typescript-support.html

    // eslint-disable-next-line no-unused-vars
    interface ComponentCustomProperties {
      $store: typeof Store
    }
  }
