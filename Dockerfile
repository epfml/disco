FROM node:slim AS builder

WORKDIR /disco

COPY package*.json .
COPY isomorphic-wrtc/package.json isomorphic-wrtc/
COPY discojs/package.json discojs/
COPY discojs-node/package.json discojs-node/
COPY server/package.json server/
RUN npm ci

COPY isomorphic-wrtc/ isomorphic-wrtc/
COPY discojs/ discojs/
COPY discojs-node/ discojs-node/
COPY tsconfig.base.json .
RUN npm --workspace=discojs --workspace=discojs-node run build

COPY server/ server/
RUN cd server/ && npm run build

FROM node:slim AS runner

WORKDIR /disco

COPY --link --from=builder /disco/package*.json /disco/
COPY --link --from=builder /disco/isomorphic-wrtc/package.json isomorphic-wrtc/
COPY --link --from=builder /disco/discojs/package.json discojs/
COPY --link --from=builder /disco/discojs-node/package.json discojs-node/
COPY --link --from=builder /disco/server/package.json server/
RUN npm --workspace=isomorphic-wrtc \
	--workspace=discojs \
	--workspace=discojs-node \
	--workspace=server \
	--omit=dev ci

COPY --link --from=builder /disco/isomorphic-wrtc/node.js isomorphic-wrtc/
COPY --link --from=builder /disco/discojs/dist/ discojs/dist/
COPY --link --from=builder /disco/discojs-node/dist/ discojs-node/dist/
COPY --link --from=builder /disco/server/dist/ server/dist/

WORKDIR server
CMD ["node", "dist/run_server.js"]
