const Hashes = require('jshashes')

export function makeID (length) {
  let result = ''
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

export function authenticate (hash, username, password) {
  return new Hashes.SHA256().hex(username + ' ' + password) === hash
}
