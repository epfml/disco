import { CONFIG } from './config'
import { getApp } from './get_server'

getApp()
  .then((app) => app.listen(CONFIG.serverPort))
  .catch(console.error)
