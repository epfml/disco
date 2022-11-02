# Installation
## Linux/MacOS
```
npm ci && npm run build
```
## Windows

Make sure to run the following commands in a terminal with **administrator** privileges.
Otherwise, symbolic links will not be created.

If you do not have the administrator privileges, you can manually create the symbolic links by
creating new shortcuts to the `discojs-core/src` folder in the `discojs-node/src` and
`discojs-web/src` folders and naming them `core`.

### Powershell
```powershell
npm ci; npm run build-win
```
### CMD
```cmd
npm ci & npm run build-win
```

# Testing
```
npm test
```