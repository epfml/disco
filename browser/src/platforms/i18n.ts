// load plaform strings
import { createI18n } from 'vue-i18n'
import config from './platforms.config.js'
import _ from 'lodash'

const getJSON = (name) => require(`./content/${name}`)
const platforms = _.map(config.platforms, (p) => [p.name, getJSON(p.file)])
platforms.push([config.default.name, getJSON(config.default.file)])

export function createCustomI18n () {
  return createI18n({
    locale: config.locale, // set locale
    fallbackLocale: config.default.name, // common variables
    messages: _.fromPairs(platforms),
    silentFallbackWarn: true, // To suppress the first warning(Not found key...)
    silentTranslationWarn: true // need both silet warn surpressing flags.
  })
}
