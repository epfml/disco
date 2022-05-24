import { CONFIG } from './config'
import app from './get_server'

app.listen(CONFIG.serverPort)
