# Disco - FAQ

### Problem:  Using TensorFlow.js on Mac laptops with M1 chips

### Solution:

`TensorFlow.js` in version `3.13.0` currently supports for M1 Mac laptops. However, make sure you have an `arm` node executable installed (not `x86`). It can be checked using:

```
node -p "process.arch"
```
### Problem:  `npm run serve` version error on Windows 11 with correct npm and Node versions

### Solution:

1. Remove npm and Node completely from your computer.
2. Install the latest version of npm and Node, then execute `npm run serve` again.
3. If you receive an error, downgrade the Node version to the appropriate version. Check [here](https://github.com/epfml/disco/blob/b133bd598a6f65e5bb6a56e21106bf6a7abdda90/mobile-browser-based-version/README.md?plain=1#L47-L51) for the versions we currently use. 

	Then run the following commands by using nvm.
	```
	nvm install 15.12.0 
	nvm use 15.12.0 
	```
	If you do not have nvm installed, it can be downloaded from [here](https://github.com/coreybutler/nvm-windows).
4. Execute `npm run serve` and you are done!
