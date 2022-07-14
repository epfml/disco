# CLI benchmark

Welcome to the Disco🔮 command line interface (CLI).

The Disco CLI allows one to easily benchmark or simply play around with `discojs` in order to see the performance
of distributed learning. It is possible to pass key arguments such as the number of users, round duration (how 
frequently the clients communicate with each other), ...

To run 4 federated clients for 15 epochs with a round duration of 5, all you have to do is type

```
npm run benchmark -- --numberOfUsers 4 --epochs 15 --roundDuration 5
```

or also using the shorter alias notation

```
npm run benchmark -- -u 4 -e 15 -r 5
```

## Quick-install guide

- install node 16 and ensure it is activated on opening any new terminal (e.g. `nvm use 16`)
- clone this repository
- `npm ci` within `discojs`, `server` and `benchmark`
- `cd discojs; rm -rf dist; npm run build`

## Running the benchmark

- `cd benchmark`
- `npm run benchmark` to run the benchmark with the default setting, to see the available flags run
- `npm run benchmark -- --help`

## Comming soon

Currently only the simple-face task is supported but different tasks will be available through the CLI 
in the future.

