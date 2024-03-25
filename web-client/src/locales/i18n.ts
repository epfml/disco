import { createI18n } from 'vue-i18n'
import english from './english'

export function createCustomI18n () {
  return createI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: { en: english }
  })
}
