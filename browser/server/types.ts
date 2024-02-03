import * as http from 'http'

export type Server = http.Server<
    typeof http.IncomingMessage,
    typeof http.ServerResponse
>
