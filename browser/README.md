# Browser

This folder contains the (Vue3) code for the disco browser

## How to run

To run the browser locally we need two things:

1. [Server](../server/README.md)
2. [discojs](../discojs/README.md)

Please refer to their respective readmes in order to understand what is required before going to the next step.

Once you have the server running, and *built* discojs, you may start the browser.

> **⚠ WARNING: discojs**  
> Since `discojs` is used as a package in the browser (and this in turn is written in TypeScript) it is required that you not build `discojs`, `npm install` is not enough.

## Running the browser

### Node Installation and NPM installation

The app is running under Node 15.12.0. It can be downloaded from [here](https://nodejs.org/en/download/releases/).

NPM is a package manager for the JavaScript runtime environment Node.js.  
To start the application (running locally) run the following command.  
Note: the application is currently developed using [NPM 7.6.3](https://www.npmjs.com/package/npm/v/7.6.3).

```
npm install
```

This command will install the necessary libraries required to run the application (defined in the `package.json` and `package-lock.json`). The latter command is only required when one is using the app for the first time.

> **⚠ WARNING: Apple Silicon.**  
> `TensorFlow.js` in version `3.13.0` currently supports for M1 mac laptops. However, make sure you have an `arm` node executable installed (not `x86`). It can be checked using:

```
node -p "process.arch"
```

### Compiling and hot-reload for development

To launch the application run the following command:

```
npm run serve
```

This will start the application locally with two visualization options:

1. One can access the running app locally, with a `localhost link`
2. One can access the running app on any device that has access to the network of his machine. To do so, use the `network link`.

>
