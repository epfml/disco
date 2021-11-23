export function checkBuffer(buffer, key, timeout) {
  return new Promise((resolve) => {
    (function waitData() {
      if (buffer[key]) {
        return resolve();
      }
      setTimeout(waitData, timeout);
    })();
  });
}

export function checkBufferUntil(buffer, key, tries, timeout) {
  return new Promise((resolve) => {
    (function waitData(n) {
      if (buffer[key] || n > tries) {
        return resolve();
      }
      setTimeout(() => waitData(n + 1), timeout);
    })(0);
  });
}

export function checkBufferWeightsUntil(buffer, length, tries, timeout) {
  return new Promise((resolve) => {
    (function waitData(n) {
      let arr = Object.values(buffer.avgWeights).flat(1);
      if (arr.length >= length || n > tries) {
        return resolve();
      }
      setTimeout(() => waitData(n + 1), timeout);
    })(0);
  });
}
