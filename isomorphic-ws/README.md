# isomorphic-ws

Allow to load a different WebSocket implementation depending on the platform.

- on node, load ws, accepting messages up to 1 GiB as federated GPT updates exceed its default limit
- in browser, simply exposes the available WebSocket implementation

It allows to simply `import WebSocket from '@epfml/isomorphic-ws'` and get the same implementation as `new WebSocket(url)` takes the same arguments on both platforms.
