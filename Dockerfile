# waiting for nodejs/docker-node#2081
FROM node:20.12 as builder

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

FROM node:20.12-slim as runner

COPY --link --from=builder package*.json .
COPY --link --from=builder isomorphic-wrtc/package.json isomorphic-wrtc/
COPY --link --from=builder discojs/package.json discojs/
COPY --link --from=builder discojs-node/package.json discojs-node/
COPY --link --from=builder server/package.json server/
RUN npm --workspace=isomorphic-wrtc \
	--workspace=discojs \
	--workspace=discojs-node \
	--workspace=server \
	--omit=dev ci

COPY --link --from=builder isomorphic-wrtc/node.js isomorphic-wrtc/
COPY --link --from=builder discojs/dist/ discojs/dist/
COPY --link --from=builder discojs-node/dist/ discojs-node/dist/
COPY --link --from=builder server/dist/ server/dist/

WORKDIR server/
CMD ["node", "dist/run_server.js"]
