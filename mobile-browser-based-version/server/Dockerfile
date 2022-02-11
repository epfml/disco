# syntax=docker/dockerfile:1

FROM ubuntu:20.04

ENV NODE_ENV=development

WORKDIR /server

COPY ["package.json", "package-lock.json*", "./"]

# Update apt-get and install required dependecies 

RUN apt-get upgrade -y \
    && apt-get update -y \
    && apt-get install -y libnode-dev \
    && apt-get install -y python3.8 \
    && apt install -y build-essential \
    && apt-get install -y curl \
    && curl --silent --location https://deb.nodesource.com/setup_14.x | bash - \
    && apt install -y nodejs 

RUN npm install 

COPY . .

ENV NODE_PATH=./dist

RUN npm run build

CMD [ "npm", "start" ]