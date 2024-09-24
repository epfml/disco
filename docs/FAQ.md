# FAQ

### Local code changes are not taken into account

Make sure to remember that `discojs`, `discojs-node` and `discojs-web` need to be re-built for code changes to be effective. You can automate this process by running `npm -w discojs run watch build` which watches for code changes to rebuild `discojs`. Similarly for `discojs-node` and `discojs-web`.

If you are changing parameters of a default task in `discojs/default_task`, you also need to restart the server after re-building `discojs`. This is because the server initializes the tasks upon starting so later changes are not taken into account.

In case of doubts, close everything, re-install dependencies (`npm ci`), re-build everything (`npm -ws run build`) and restart Disco.

### Peers can't connect to each other in decentralized learning

Make sure you are connected to internet, without any VPN. Indeed, WebRTC needs connection to reach an online server (the STUN server, `simple-peer` currently uses `stun.l.google.com:19302`) for peers to establish a direct connection. More information on WebRTC [here](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API).

You can troubleshoot the issue by trying [the simple use case](https://github.com/feross/simple-peer?tab=readme-ov-file#usage) of `simple-peer`.

### Using TensorFlow.js on Mac laptops with M1 chips

`TensorFlow.js` in version `3` currently supports M1 Mac laptops. However, make sure you have an `arm` Node.js executable installed (not `x86`). It can be checked using:

```
node -p "process.arch"
```

which should output something similar to `arm64`. Then, `npm i @tensorflow/tfjs` and `npm i @tensorflow/tfjs-node` will install TF.js for ARM.

### `npm run dev` version error on Windows 11 with correct npm and Node versions

1. Remove npm and Node completely from your computer.
2. Install the latest version of npm and Node, then execute `npm run dev` again.
3. If you receive an error, then run the following commands by using nvm.

   ```
   nvm use
   ```

   If you do not have nvm installed, it can be downloaded from [here](https://github.com/coreybutler/nvm-windows).

4. Execute `npm run dev` and you are done!

### VSCode can't resolve imports

You may not be able to open the editor from the repo root level without VSCode raising imports errors. If that is the case, you should start VSCode from inside the module you are working such that the editor can resolve the imports. In practice, that is any folder level that contains a package.json such as `server`, `webapp`, etc. For example, if you are working on the CLI, you should start VSCode with the command `code cli` from the root level (or `cd cli`, `code .`)
