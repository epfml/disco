import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const onnxModule = require('./onnx.cjs');

export const onnx = onnxModule.onnx;
export default onnxModule;