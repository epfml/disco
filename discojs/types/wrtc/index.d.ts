// https://github.com/node-webrtc/node-webrtc/issues/605

declare module 'wrtc' {
  const wrtc: {
    RTCPeerConnection: typeof RTCPeerConnection
    RTCSessionDescription: typeof RTCSessionDescription
    RTCIceCandidate: typeof RTCIceCandidate
  }
  export type WRTC = typeof wrtc
  export default wrtc
}
