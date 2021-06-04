#!/usr/bin/env sh

# abort on errors
set -e

# build
npm run build

# navigate into the build output directory
cd dist

# initialize repo
git init
git add -A
git commit -m 'deploy'

# push to DeAI
git push -f https://github.com/epfml/DeAI.git master:gh-pages

cd -