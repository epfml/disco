export function craftPostRequest(property, value) {
  const body = {};
  body[property] = value;
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Tries to fetch a resource with the given API request function until successful.
 * Limited to a number of tries.
 * @param {Function} APIRequest The API request's function.
 * @param {Number} tries The number of tries.
 * @param {Number} time Time between tries.
 * @param {any} args Arguments passed to the API request's function.
 * @returns The successful response.
 * @throws An error if a successful response could not be obtained
 * after the specified number of tries.
 */
export function tryAPIRequest(APIRequest, tries, time, ...args) {
  return new Promise((resolve, reject) => {
    async function _tryAPIRequest(triesLeft) {
      console.log('tries left: ', triesLeft);
      const response = await APIRequest(...args);
      if (response.ok) {
        return resolve(response);
      }
      if (triesLeft <= 0) {
        return reject('Failed to get response from server.');
      }
      /**
       * Wait before performing the request again.
       */
      setTimeout(() => _tryAPIRequest(triesLeft - 1), time);
    }
    _tryAPIRequest(tries);
  });
}
