// import { List } from 'immutable'
//
// type PeerID = number
//
// const TICK = 100
//
// const MAX_WAIT_PER_ROUND = 10_000
// const timeoutError = new Error('timeout')
//
// class MyClass {
//   protected peers: List<PeerID> = List()
// }
// class MyChild extends MyClass {
//   async myMethod (): Promise<void> {
//     this.peers = this.peers.push(42)
//     await new Promise<void>((resolve, reject) => {
//       const interval = setInterval(() => {
//         if (this.peers.size >= 0) {
//           this.peers.forEach((v, k, i) => { console.log(v) })
//           clearInterval(interval)
//           resolve()
//         }
//       }, TICK)
//
//       setTimeout(() => {
//         clearInterval(interval)
//         reject(timeoutError)
//       }, MAX_WAIT_PER_ROUND)
//     }).catch((err) => {
//       if (err !== timeoutError) {
//         throw err
//       }
//     })
//   }
// }
//
// const mC: MyChild = new MyChild()
// mC.myMethod()
