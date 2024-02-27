# syntax=docker/dockerfile:1

FROM ubuntu:20.04

ENV NODE_ENV=development

RUN apt-get upgrade -y \
    && apt-get update -y \
    && apt-get install -y libnode-dev \
    && apt-get install -y python3.8 \
    && apt install -y build-essential \
    && apt-get install -y curl \
    && curl --silent --location https://deb.nodesource.com/setup_16.x | bash - \
    && apt install -y nodejs 

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

