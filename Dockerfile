# TODO freeze to 22 until tfjs#8425 is merged
FROM node:22 AS builder

RUN npm i -g pnpm

WORKDIR /disco

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY isomorphic-wrtc/package.json isomorphic-wrtc/
COPY discojs/package.json discojs/
COPY discojs-node/package.json discojs-node/
COPY server/package.json server/
RUN pnpm ci

COPY isomorphic-wrtc/ isomorphic-wrtc/
# Necessary for syncing workspace injected dependencies
RUN pnpm ci
COPY discojs/ discojs/
COPY discojs-node/ discojs-node/
COPY tsconfig.base.json .
COPY tsconfig.base.lib.json .
RUN pnpm -F discojs -F discojs-node run build

COPY server/ server/
RUN pnpm -F server run build

FROM node:22-slim AS runner

WORKDIR /disco

RUN npm i -g pnpm

COPY --link --from=builder /disco/package.json /disco/pnpm*.yaml /disco/
COPY --link --from=builder /disco/isomorphic-wrtc/package.json isomorphic-wrtc/
COPY --link --from=builder /disco/discojs/package.json discojs/
COPY --link --from=builder /disco/discojs-node/package.json discojs-node/
COPY --link --from=builder /disco/server/package.json server/

RUN pnpm --prod ci

COPY --link --from=builder /disco/isomorphic-wrtc/ isomorphic-wrtc/
COPY --link --from=builder /disco/discojs/dist/ discojs/dist/
COPY --link --from=builder /disco/discojs-node/dist/ discojs-node/dist/
COPY --link --from=builder /disco/server/dist/ server/dist/

WORKDIR server
CMD ["node", "dist/main.js"]
