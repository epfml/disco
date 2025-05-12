# TODO freeze to 22 until tfjs#8425 is merged
FROM node:24 AS builder

WORKDIR /disco

COPY package*.json .
COPY discojs/package.json discojs/
COPY discojs-node/package.json discojs-node/
COPY server/package.json server/
RUN npm ci

COPY discojs/ discojs/
COPY discojs-node/ discojs-node/
COPY tsconfig.base.json .
RUN npm --workspace=discojs --workspace=discojs-node run build

COPY server/ server/
RUN cd server/ && npm run build

FROM node:24-slim AS runner

WORKDIR /disco

COPY --link --from=builder /disco/package*.json /disco/
COPY --link --from=builder /disco/discojs/package.json discojs/
COPY --link --from=builder /disco/discojs-node/package.json discojs-node/
COPY --link --from=builder /disco/server/package.json server/
RUN npm --omit=dev ci

COPY --link --from=builder /disco/discojs/dist/ discojs/dist/
COPY --link --from=builder /disco/discojs-node/dist/ discojs-node/dist/
COPY --link --from=builder /disco/server/dist/ server/dist/

WORKDIR server
CMD ["node", "dist/main.js"]
