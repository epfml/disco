// https://github.com/patagona-technologies/isomorphic-wrtc/pull/1

declare const wrtc: {
  RTCSessionDescription: typeof RTCSessionDescription;
  RTCRtpTransceiver: typeof RTCRtpTransceiver;
  RTCRtpSender: typeof RTCRtpSender;
  RTCRtpReceiver: typeof RTCRtpReceiver;
  RTCPeerConnectionIceEvent: typeof RTCPeerConnectionIceEvent;
  RTCPeerConnection: typeof RTCPeerConnection;
  RTCIceCandidate: typeof RTCIceCandidate;
  RTCDataChannelEvent: typeof RTCDataChannelEvent;
  RTCDataChannel: typeof RTCDataChannel;
  MediaStreamTrack: typeof MediaStreamTrack;
  MediaStream: typeof MediaStream;
};

export type WRTC = typeof wrtc;
export default wrtc;
