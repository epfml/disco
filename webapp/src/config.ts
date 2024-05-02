export interface Config {
    readonly serverUrl: URL
}

export const CONFIG: Config = {
  serverUrl: new URL('', import.meta.env.VITE_SERVER_URL)
}
