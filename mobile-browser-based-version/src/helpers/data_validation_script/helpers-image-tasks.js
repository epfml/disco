export async function checkData(trainingData) {
  return { accepted: Object.keys(trainingData).length > 1 };
}
