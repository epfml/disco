#!/bin/sh
set -e # Exit script on error
DIR="$( cd "$( dirname "$0" )" ; pwd -P )" # Fetch current directory

printf '\n>>> Installing disco.js dependencies and building the library\n'
cd $DIR/discojs
npm ci
npm run build

printf '\n>>> Installing the web client dependencies\n' 
cd $DIR/web-client
npm ci
npm link $DIR/discojs/discojs-web

printf '\n>>> Installing the server dependencies\n'
cd $DIR/server
npm ci
npm link $DIR/discojs/discojs-node

printf '\n>>> Installing the CLI dependencies\n'
cd $DIR/cli
npm ci

printf '\n>>> Installing ts-node\n'
npm install -g ts-node

printf '\n>>> Downloading and extracting sample training data\n'
./get_training_data.sh

printf '\n>>> Installation sucessful!\n'
