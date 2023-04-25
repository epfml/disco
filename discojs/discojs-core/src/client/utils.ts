// Time to wait for the others in milliseconds.
export const MAX_WAIT_PER_ROUND = 15_000

export async function timeout (ms = MAX_WAIT_PER_ROUND): Promise<never> {
  return await new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('timeout')), ms)
  })
}
