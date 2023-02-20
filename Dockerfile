# syntax=docker/dockerfile:1

FROM ubuntu:20.04

ENV NODE_ENV=production

RUN apt-get upgrade -y \
    && apt-get update -y \
    && apt-get install -y libnode-dev \
    && apt-get install -y python3.8 \
    && apt install -y build-essential \
    && apt-get install -y curl \
    && curl --silent --location https://deb.nodesource.com/setup_16.x | bash - \
    && apt install -y nodejs 

COPY discojs/package*.json discojs/
# production flag disabled else devDependencies are ignored (no tsc available)
# Ideally this image should be update to not depend on dev dependencies
RUN cd discojs/ && npm ci --production=false
RUN cd discojs/ && npx tsc -h

COPY discojs/tsconfig.base.json discojs/

COPY discojs/discojs-core/types/ discojs/discojs-core/types/
COPY discojs/discojs-core/src/ discojs/discojs-core/src/

COPY discojs/discojs-node/ discojs/discojs-node/
RUN cd discojs/discojs-node/ && npm run build

COPY server/ server/
RUN cd server/ && npm ci --production=false && ls -la node_modules && npm link --production=false ../discojs/discojs-node

RUN cd server/ && npm run build

WORKDIR /server
CMD [ "npm", "start" ]

