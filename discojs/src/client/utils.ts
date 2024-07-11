// Time to wait for the others in milliseconds.
export const MAX_WAIT_PER_ROUND = 15_000

export async function timeout (ms = MAX_WAIT_PER_ROUND, errorMsg: string = 'timeout'): Promise<never> {
  return await new Promise((_, reject) => {
    setTimeout(() => { reject(new Error(errorMsg)) }, ms)
  })
}
