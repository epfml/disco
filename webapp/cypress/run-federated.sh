#!/bin/sh
set -eu

export DISCO_COLLABORATIVE_E2E=1
export VITE_SERVER_URL=http://localhost:8080

# Each task gets a fresh server and Node peer. CI selects one task per job.
for task in ${DISCO_E2E_FEDERATED_TASK:-titanic lus_covid}; do
  case "$task" in
    titanic|lus_covid) ;;
    *) echo "Unknown federated E2E task: $task" >&2; exit 1 ;;
  esac
  export DISCO_E2E_FEDERATED_TASK="$task"
  start-server-and-test \
    'node --experimental-strip-types cypress/support/federated.ts' http://localhost:8080 \
    'vite --mode test --port 1351 --strictPort' http://localhost:1351 \
    "pnpm exec cypress run --e2e --spec cypress/e2e/training/federated/$task.cy.ts"
done
