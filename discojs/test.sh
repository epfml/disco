DIR="$( cd "$( dirname "$0" )" ; pwd -P )"

cd $DIR/discojs-node && npm test &&
cd $DIR/discojs-core && npm test &&
cd $DIR/discojs-web && npm test
