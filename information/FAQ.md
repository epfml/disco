# Disco - FAQ

### Problem: Using TensorFlow.js on Mac laptops with M1 chips

### Solution:

`TensorFlow.js` in version `3` currently supports M1 Mac laptops. However, make sure you have an `arm` Node.js executable installed (not `x86`). It can be checked using:

```
node -p "process.arch"
```

which should output something similar to `arm64`. Then, `npm i @tensorflow/tfjs` and `npm i @tensorflow/tfjs-node` will install TF.js for ARM.

### Problem: `npm run dev` version error on Windows 11 with correct npm and Node versions

### Solution:

1. Remove npm and Node completely from your computer.
2. Install the latest version of npm and Node, then execute `npm run dev` again.
3. If you receive an error, then run the following commands by using nvm.

   ```
   nvm use
   ```

   If you do not have nvm installed, it can be downloaded from [here](https://github.com/coreybutler/nvm-windows).

4. Execute `npm run dev` and you are done!
