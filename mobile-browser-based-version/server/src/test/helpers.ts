export function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export function craftPostRequest (property, value) {
  const body = {}
  body[property] = value
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }
}
