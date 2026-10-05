#!/bin/sh
set -eu

export DISCO_COLLABORATIVE_E2E=1
export VITE_SERVER_URL=http://localhost:8081

for peers in ${DISCO_E2E_DECENTRALIZED_PEERS:-node}; do
  case "$peers" in
    node)
      start-server-and-test \
        'node --experimental-strip-types cypress/support/decentralized_test_server.ts --with-node-peers' http://localhost:8081 \
        'vite --mode test --port 1354 --strictPort' http://localhost:1354 \
        'pnpm exec cypress run --e2e --browser chrome --config baseUrl=http://localhost:1354 --spec cypress/e2e/training/decentralized/node_peers.cy.ts'
      ;;
    *) echo "Unknown decentralized E2E peers: $peers" >&2; exit 1 ;;
  esac
done
