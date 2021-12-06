export function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function craftAPIRequest(clientID, property, value) {
  const body = {
    id: clientID,
    timestamp: new Date(),
  };
  if (property !== undefined) {
    body[property] = value;
  }
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}
