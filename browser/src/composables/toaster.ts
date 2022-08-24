import { createToaster } from '@meforma/vue-toaster'

const toaster = createToaster({ duration: 5000 })

export const useToaster = () => toaster
