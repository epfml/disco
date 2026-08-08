/** Dataset shapers, convenient to map with */
export {
  NormalizedImage,
  resize,
  normalize,
  removeAlpha,
  expandToMulticolor,
} from "./image.js";
export { convertToNumber, extractColumn, indexInList } from "./tabular.js";
export {
  preprocess,
  preprocessWithoutLabel,
  postprocess,
} from "./processing.js";
