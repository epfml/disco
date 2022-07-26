// load plaform strings
import { createI18n } from 'vue-i18n'
import { List } from 'immutable'
import config from './locales.config.js'

interface Locale {
  name: string
  file: string
}

const getJSON = (name: string) => require(`./content/${name}`)
const locales = Object.fromEntries(
  List(config.locales as Locale[])
    .map((locale) => [locale.name, getJSON(locale.file)]))
locales[config.default.name] = getJSON(config.default.file)

export function createCustomI18n () {
  return createI18n({
    locale: config.locale, // set locale
    fallbackLocale: config.default.name, // common variables
    messages: locales,
    silentFallbackWarn: true, // To suppress the first warning(Not found key...)
    silentTranslationWarn: true // need both silet warn surpressing flags.
  })
}
