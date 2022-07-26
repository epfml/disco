import { createToaster } from '@meforma/vue-toaster'

/**
 * Convenient wrapper of Vue Toaster https://github.com/MeForma/vue-toaster for
 * Vue components using the composition API
 */

export const toaster = createToaster({ duration: 5000 })
