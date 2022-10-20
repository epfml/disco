DIR="$( cd "$( dirname "$0" )" ; pwd -P )"

cd $DIR/discojs-node && rm -rf dist/ && npm run build &&
cd $DIR/discojs-web && rm -rf dist/ && npm run build
