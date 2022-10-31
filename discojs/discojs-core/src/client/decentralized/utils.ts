// Time to wait between network checks in milliseconds.
const TICK = 100

// Time to wait for the others in milliseconds.
export const MAX_WAIT_PER_ROUND = 10_000

export async function timeout (ms: number): Promise<never> {
  return await new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('timeout')), ms)
  })
}

// check if a given boolean condition is true, checks continuously until maxWait time is reached
export async function pauseUntil (condition: () => boolean): Promise<void> {
  return await new Promise<void>((resolve, reject) => {
    const timeWas = new Date().getTime()
    const wait = setInterval(function () {
      if (condition()) {
        console.debug('resolved after', new Date().getTime() - timeWas, 'ms')
        clearInterval(wait)
        resolve()
      } else if (new Date().getTime() - timeWas > MAX_WAIT_PER_ROUND) { // Timeout
        console.debug('rejected after', new Date().getTime() - timeWas, 'ms')
        clearInterval(wait)
        reject(new Error('timeout'))
      }
    }, TICK)
  })
}
