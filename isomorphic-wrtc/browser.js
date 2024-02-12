"use strict";

// from get-browser-rtc
// TODO move to ES import
function getBrowserRTC() {
  if (typeof globalThis === "undefined") return null;
  var wrtc = {
    RTCPeerConnection:
      globalThis.RTCPeerConnection ||
      globalThis.mozRTCPeerConnection ||
      globalThis.webkitRTCPeerConnection,
    RTCSessionDescription:
      globalThis.RTCSessionDescription ||
      globalThis.mozRTCSessionDescription ||
      globalThis.webkitRTCSessionDescription,
    RTCIceCandidate:
      globalThis.RTCIceCandidate ||
      globalThis.mozRTCIceCandidate ||
      globalThis.webkitRTCIceCandidate,
  };
  if (!wrtc.RTCPeerConnection) return null;
  return wrtc;
}
module.exports = getBrowserRTC();
