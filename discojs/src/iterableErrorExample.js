'use strict'
const __extends = (this && this.__extends) || (function () {
  var extendStatics = function (d, b) {
    extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b }) ||
            function (d, b) { for (const p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p] }
    return extendStatics(d, b)
  }
  return function (d, b) {
    if (typeof b !== 'function' && b !== null) { throw new TypeError('Class extends value ' + String(b) + ' is not a constructor or null') }
    extendStatics(d, b)
    function __ () { this.constructor = d }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __())
  }
})()
const __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt (value) { return value instanceof P ? value : new P(function (resolve) { resolve(value) }) }
  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled (value) { try { step(generator.next(value)) } catch (e) { reject(e) } }
    function rejected (value) { try { step(generator.throw(value)) } catch (e) { reject(e) } }
    function step (result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected) }
    step((generator = generator.apply(thisArg, _arguments || [])).next())
  })
}
const __generator = (this && this.__generator) || function (thisArg, body) {
  let _ = { label: 0, sent: function () { if (t[0] & 1) throw t[1]; return t[1] }, trys: [], ops: [] }; let f; let y; let t; let g
  return g = { next: verb(0), throw: verb(1), return: verb(2) }, typeof Symbol === 'function' && (g[Symbol.iterator] = function () { return this }), g
  function verb (n) { return function (v) { return step([n, v]) } }
  function step (op) {
    if (f) throw new TypeError('Generator is already executing.')
    while (_) {
      try {
        if (f = 1, y && (t = op[0] & 2 ? y.return : op[0] ? y.throw || ((t = y.return) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t
        if (y = 0, t) op = [op[0] & 2, t.value]
        switch (op[0]) {
          case 0: case 1: t = op; break
          case 4: _.label++; return { value: op[1], done: false }
          case 5: _.label++; y = op[1]; op = [0]; continue
          case 7: op = _.ops.pop(); _.trys.pop(); continue
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue }
            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break }
            if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break }
            if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break }
            if (t[2]) _.ops.pop()
            _.trys.pop(); continue
        }
        op = body.call(thisArg, _)
      } catch (e) { op = [6, e]; y = 0 } finally { f = t = 0 }
    }
    if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true }
  }
}
exports.__esModule = true
const immutable_1 = require('immutable')
const TICK = 100
const MAX_WAIT_PER_ROUND = 10000
const timeoutError = new Error('timeout')
const MyClass = /** @class */ (function () {
  function MyClass () {
    this.peers = (0, immutable_1.List)()
  }
  return MyClass
}())
const MyChild = /** @class */ (function (_super) {
  __extends(MyChild, _super)
  function MyChild () {
    return _super !== null && _super.apply(this, arguments) || this
  }
  MyChild.prototype.myMethod = function () {
    return __awaiter(this, void 0, void 0, function () {
      const _this = this
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            this.peers = this.peers.push(42)
            return [4 /* yield */, new Promise(function (resolve, reject) {
              var interval = setInterval(function () {
                if (_this.peers.size >= 0) {
                  _this.peers.forEach(function (v, k, i) { console.log(v) })
                  clearInterval(interval)
                  resolve()
                }
              }, TICK)
              setTimeout(function () {
                clearInterval(interval)
                reject(timeoutError)
              }, MAX_WAIT_PER_ROUND)
            }).catch(function (err) {
              if (err !== timeoutError) {
                throw err
              }
            })]
          case 1:
            _a.sent()
            return [2]
        }
      })
    })
  }
  return MyChild
}(MyClass))
const mC = new MyChild()
mC.myMethod()
