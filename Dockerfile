FROM node:20

COPY package*.json .
COPY isomorphic-wrtc/package.json isomorphic-wrtc/
COPY discojs/discojs-core/package.json discojs/discojs-core/
COPY discojs/discojs-node/package.json discojs/discojs-node/
COPY server/package.json server/
RUN npm ci

COPY isomorphic-wrtc/ isomorphic-wrtc/
COPY discojs/tsconfig.base.json discojs/
COPY discojs/discojs-core/ discojs/discojs-core/
COPY discojs/discojs-node/ discojs/discojs-node/
RUN npm run build --workspace=@epfml/discojs-core --workspace=@epfml/discojs-node

COPY server/ server/
RUN cd server/ && npm run build

WORKDIR /server
CMD [ "npm", "start" ]

