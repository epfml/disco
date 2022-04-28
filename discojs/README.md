# discojs

discojs contains the core code of disco.

## Node Installation and NPM installation

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

## Build

In order to enable the Browser to use the `discojs` package, we must build discojs:

```
npm run build
```
