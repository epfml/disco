async function getImage (path) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.src = path
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('could not load image: ' + path))
  })
}

export function getExampleImage (url) {
  if (url === '') {
    return null
  }
  const images = require.context('../../../example_training_data/', false)
  return images(url)
}

/**
 * Checks images for validity critera: if height and width of each image are at least as large as required.
 * Computes validity status that is true if all images are valid and there are at least two valid images.
 *
 * @param {Object} trainingData: data provided through interface
 * @param {Object} trainingInfo: training information from the specific task that is used to check validity
 * @returns {Object} accepted: status of data (true if all images are valid) and nbAccepted: nr of valid images
 */

export async function checkData (trainingData, trainingInfo) {
  const expectedWidth = trainingInfo.IMAGE_W
  const expectedHeight = trainingInfo.IMAGE_H
  let status = true
  let nrImgs = 0

  const files = Object.keys(trainingData)
  if (trainingInfo.LABEL_ASSIGNMENT) {
    files.pop()
  }
  for (let index = 0; index < files.length; index++) {
    try {
      const data = await getImage(files[index]) as any
      // filtering criteria for images
      if (data.width >= expectedWidth && data.height >= expectedHeight) {
        nrImgs += 1
      }
    } catch (e) {
      console.log('Error during image validation: ', e)
    }
  }

  console.log('found imgs and files: ', nrImgs, files.length)
  if (nrImgs <= 1 || nrImgs < files.length) {
    status = false
  }

  return { accepted: status, nbAccepted: nrImgs }
}
