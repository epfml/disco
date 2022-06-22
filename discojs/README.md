# discojs

discojs contains the core code of disco.

## Node and NPM installation

The app is running under Node.js v16. NPM is a package manager for the JavaScript runtime environment Node.js.
We recommend using [nvm](https://github.com/nvm-sh/nvm) for installing both Node.js and NPM.

To install the application's dependencies, run the following command:

```
npm ci
```

> **⚠ WARNING: Apple Silicon.**
> `TensorFlow.js` in version `3.13.0` currently supports for M1 mac laptops. However, make sure you have an `arm` node executable installed (not `x86`). It can be checked using:

```
node -p "process.arch"
```

which should return `arm64`.

## Build

In order to enable the browser and server modules to use the `discojs` package, we must build discojs:

```
npm run build
```

This invokes the TypeScript compiler (`tsc`). To recompile from stratch, simply `rm -rf dist/` before running `npm run build` again.
