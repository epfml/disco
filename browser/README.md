# Browser

This folder contains the (Vue 3) code for the Disco browser client

## Preliminaries

To run the Disco client locally we need two things:

1. [Server](../server/README.md)
2. [discojs](../discojs/README.md)

Please refer to their respective readmes in order to understand what is required before going to the next step.

⚠ Once you have the server running, and *built* discojs, you may start the browser.

> **⚠ WARNING: discojs**  
> Since `discojs` is used as a package in the browser (and this in turn is written in TypeScript) it is required that you build `discojs`, `npm install` is not enough.

## Hosting the Disco client

### Node and NPM Installation

The app is running under Node.js v16. NPM is a package manager for the JavaScript runtime environment Node.js.
We recommend using [nvm](https://github.com/nvm-sh/nvm) for installing both Node.js and NPM.

To install the application's dependencies, run the following commands:

```
npm ci
```

> **⚠ WARNING: Apple Silicon.**  
> `TensorFlow.js` in version `3.13.0` currently supports for M1 mac laptops. However, make sure you have an `arm` node executable installed (not `x86`). It can be checked using:

```
node -p "process.arch"
```

### Running for development

The Disco client is a Vue app. For development purposes, we recommend running the client in Vue's development mode:

```
npm run serve
```

which supports hot-reload. This will start the application locally with two visualization options:

1. One can access the running app locally, with a `localhost link`
2. One can access the running app on any device that has access to the network of his machine. To do so, use the `network link`.

Note: As mentioned above, the browser requires the [server](../browser/README.md) to run. Make sure both services run on different ports.

### Running for production

TODO
