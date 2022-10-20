export interface Config {
    readonly serverUrl: URL
}

export const CONFIG: Config = {
  serverUrl: new URL('', process.env.VUE_APP_SERVER_URL)
}
