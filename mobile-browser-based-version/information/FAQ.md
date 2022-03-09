# Disco - FAQ

### Issue using the apple silicon chips:

`TensorFlow.js` in version `3.13.0` currently suportes for M1 mac laptops. However, make sure you have an `arm` node executable installed (not `x86`). It can be checked using:

```
node -p "process.arch"
```
