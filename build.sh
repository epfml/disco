DIR="$( cd "$( dirname "$0" )" ; pwd -P )"

cd $DIR/discojs-node && rm -rf dist/ && npm run build &&
cd $DIR/discojs && rm -rf dist/ && npm run build
