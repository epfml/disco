# Web App
<div align="center">
  <img src="https://github.com/epfml/disco/assets/33122365/4722e921-2344-4c65-86f8-7cf6513d2cec">
</div>

This folder contains the Vue 3 implementation of a browser interface for DISCO. 
A public instance is available at https://epfml.github.io/disco/#/ 

## Installation

There are no addition steps once you have followed the installation instructions in [DEV.md](../DEV.md).

> [!Note] 
> For Apple Silicon, `TensorFlow.js` since version `3.13.0` and newer do support M1 processors for macs. To do so, make sure you have an `arm` node executable installed (not `x86`): running `node -p "process.arch"` should return `arm64`.

## Running for development

The `web-client` requires that an server instance is running. You can start a local one with:
```
npm -w server start # from the root folder
```
The web-client can now be started with:
```
npm -w web-client start # from the root folder
npm start # from the web-client folder
```
The Vue development mode supports hot-reloading so the client will restart whenever a change in `web-client` is detected. Starting the Vue client sjhould print something similar to
```
App running at:
  - Local:   http://localhost:8081/
  - Network: http://192.168.43.231:8081/
```
As such, any device on the same network can access the app.

> [!TIP]
> Remember that hot-reloading only considers the `web-client` folder so if you plan on making changes to `discojs`, I recommend you use the watch command to automatically rebuild the module: `npm -w discojs run watch build`
