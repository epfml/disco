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

COPY discojs/package*.json discojs/
RUN cd discojs && npm ci

COPY server/package*.json server/
RUN cd server && npm ci

COPY discojs/ discojs/
RUN cd discojs && npm run build

COPY server/ server/
RUN cd server && npm run build

WORKDIR /server
ENV NODE_PATH=./dist
CMD [ "npm", "start" ]
