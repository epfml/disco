# isomorphic-wrtc

Allow to load a different WebRTC implementation depending on the platform.

* on node, load @koush/wrtc, a C++ plugin
* in browser, simply exposes the available WebRTC implementation

It allows to simply `import wrct from 'isomorphic-wrtc'` and get the same coding experience.

It is also augmented with types.
