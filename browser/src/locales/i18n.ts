// load plaform strings
import { createI18n } from 'vue-i18n'
import config from './locales.config.js'
import _ from 'lodash'

const getJSON = (name) => require(`./content/${name}`)
const locales = _.map(config.locales, (l) => [l.name, getJSON(l.file)])
locales.push([config.default.name, getJSON(config.default.file)])

export function createCustomI18n () {
  return createI18n({
    locale: config.locale, // set locale
    fallbackLocale: config.default.name, // common variables
    messages: _.fromPairs(locales),
    silentFallbackWarn: true, // To suppress the first warning(Not found key...)
    silentTranslationWarn: true // need both silet warn surpressing flags.
  })
}
