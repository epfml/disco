DIR="$( cd "$( dirname "$0" )" ; pwd -P )"

cd $DIR/discojs-node && npm run test &&
cd $DIR/discojs-core && npm run test &&
cd $DIR/discojs && npm run test
