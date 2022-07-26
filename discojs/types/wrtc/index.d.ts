// https://github.com/node-webrtc/node-webrtc/issues/605

declare module 'wrtc' {
  const wrtc: {
    MediaStream: MediaStream
    MediaStreamTrack: MediaStreamTrack
    RTCDataChannel: RTCDataChannel
    RTCDataChannelEvent: RTCDataChannelEvent
    RTCDtlsTransport: RTCDtlsTransport
    RTCIceCandidate: RTCIceCandidate
    RTCIceTransport: RTCIceTransport
    RTCPeerConnection: RTCPeerConnection
    RTCPeerConnectionIceEvent: RTCPeerConnectionIceEvent
    RTCRtpReceiver: RTCRtpReceiver
    RTCRtpSender: RTCRtpSender
    RTCRtpTransceiver: RTCRtpTransceiver
    RTCSessionDescription: RTCSessionDescription
    getUserMedia: typeof navigator.mediaDevices['getUserMedia']
    mediaDevices: typeof navigator.mediaDevices
  }
  export type WRTC = typeof wrtc
  export default wrtc
}
