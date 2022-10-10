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

COPY discojs-core/package*.json discojs-core/
RUN cd discojs-core && npm ci

COPY discojs-node/package*.json discojs-node/
RUN cd discojs-node && npm ci

COPY server/package*.json server/
RUN cd server && npm ci

COPY discojs-core/ discojs-core/
RUN cd discojs-core && npm run build

COPY discojs-node/ discojs-node/
RUN cd discojs-node && npm run build

COPY server/ server/
RUN cd server && npm run build

WORKDIR /server
CMD [ "npm", "start" ]
