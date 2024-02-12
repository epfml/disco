# FAQ

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

You may not be able to open the editor from the repo root level without VSCode raising imports errors. If that is the case, you should start VSCode from inside the module you are working such that the editor can resolve the imports. In practice, that is any folder level that contains a package.json such as `server`, `web-client`, etc. For example, if you are working on the CLI, you should start VSCode with the command `code cli` from the root level (or `cd cli`, `code .`)




