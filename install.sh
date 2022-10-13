DIR="$( cd "$( dirname "$0" )" ; pwd -P )"

cd $DIR/discojs-core && npm ci && rm -rf dist/ && npm run build &&
cd $DIR/discojs-node && npm ci && rm -rf dist/ && npm run build &&
cd $DIR/discojs && npm ci && rm -rf dist/ && npm run build

