async function getImage(path) {
  return new Promise((resolve, reject) => {
    var image = new Image();
    image.src = path;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('could not load image: ' + path));
  });
}

/**
 * Checks images for validity critera: if height and width of each image are at least as large as required.
 * Computes validity status that is true if all images are valid and there are at least two valid images.
 *
 * @param {Object} trainingData: data provided through interface
 * @param {Object} trainingInfo: training information from the specific task that is used to check validity
 * @returns {Object} accepted: status of data (true if all images are valid) and nr_accepted: nr of valid images
 */

export async function checkData(trainingData, trainingInfo) {
  const expected_width = trainingInfo.IMAGE_W;
  const expected_height = trainingInfo.IMAGE_H;
  let status = true;
  let nr_imgs = 0;

  let files = Object.keys(trainingData);
  if (trainingInfo.LABEL_ASSIGNMENT) {
    files.pop()
  }
  for (let index = 0; index < files.length; index++) {
    try {
      var data = await getImage(files[index]);
      // filtering criteria for images
      if (data.width >= expected_width && data.height >= expected_height) {
        nr_imgs += 1;
      }
    } catch (e) {
      console.log('Error during image validation: ', e);
    }
  }

  console.log('found imgs and files: ', nr_imgs, files.length)
  if (nr_imgs <= 1 || nr_imgs < files.length) {
    status = false;
  }

  return { accepted: status, nr_accepted: nr_imgs };
}
