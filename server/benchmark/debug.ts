import * as tf from '@tensorflow/tfjs-node'

async function main (): Promise<void> {
  const modelPath = 'file://./debugModel'

  const model = tf.sequential(
    { layers: [tf.layers.dense({ units: 1, inputShape: [3] })] })
  await model.save(modelPath)
  console.log('initial disposed:', model.dispose().numDisposedVariables)

  const models = await Promise.all([
    tf.loadLayersModel(modelPath + '/' + 'model.json'),
    tf.loadLayersModel(modelPath + '/' + 'model.json')
  ])
  models.forEach((m, i) => {
    console.log(`${i} disposed: ${m.dispose().numDisposedVariables}`)
  })

  console.log('memory:', tf.memory())

  await new Promise((resolve) => setTimeout(resolve, 10_000))
}

main().catch(console.error)
