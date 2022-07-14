# CLI benchmark

Welcome to the Disco🔮 command line interface (CLI), which allows you to run any disco task, such as for training, validation and benchmarking 

## Quick-install guide

- install node 16 and ensure it is activated on opening any new terminal (e.g. `nvm use 16`)
- clone this repository
- `npm ci` within `discojs`, `server` and `benchmark`
- `cd discojs; rm -rf dist; npm run build`
- `cd server; npm run dev`, check that the server is indeed running on localhost:8080
- `cd browser; npm run serve`, check that the browser client is running on localhost:8081

## Running the benchmark

- `cd benchmark`
- `npm run benchmark` to run the benchmark with the default setting, to see the available flags run
- `npm run benchmark -- --help`

