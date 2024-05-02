# waiting for nodejs/docker-node#2081
FROM node:20.12

COPY package*.json .
COPY isomorphic-wrtc/package.json isomorphic-wrtc/
COPY discojs/package.json discojs/
COPY discojs-node/package.json discojs-node/
COPY server/package.json server/
RUN npm ci

COPY isomorphic-wrtc/ discojs/ discojs-node/ tsconfig.base.json .
RUN npm run build --workspace=@epfml/discojs --workspace=@epfml/discojs-node

COPY server/ .
RUN cd server/ && npm run build

WORKDIR /server
CMD [ "npm", "start" ]
