#!/bin/bash

echo '\n>>> Installing disco.js dependencies and building the library\n'
cd discojs
npm ci && npm run build

echo '\n>>> Installing the web client dependencies\n' 
cd ../web-client
npm ci && npm link ../discojs/discojs-web

echo '\n>>> Installing the server dependencies\n'
cd ../server
npm ci && npm link ../discojs/discojs-node

cd ..

npm install -g ts-node

echo '\n >>> Installation sucessful!\n'
