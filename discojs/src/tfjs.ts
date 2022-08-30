import * as tf from '@tensorflow/tfjs'

export { tf }

async function setTfjsnodeIfInNode (): Promise<void> {
  // Only use tfjs-node env in node env
  // Note, due to webpack? checks we
  // put the string outside of the import
  // to take advantage of lazy loading.
  if (typeof window === 'undefined') {
    const tfjsNode = '@tensorflow/tfjs-node'
    await import(tfjsNode)
  }
}

setTfjsnodeIfInNode().catch(console.error)
