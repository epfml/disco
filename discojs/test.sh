set -e # Exit script on error
DIR="$( cd "$( dirname "$0" )" ; pwd -P )" # Fetch current directory

echo '\n>>> Make sure a server instance is running and reachable at http://localhost:8080! <<<'

echo '\n>>> Rebuilding discojs\n'
cd $DIR
npm run build

echo '\n>>> Testing disco-core\n'
cd $DIR/discojs-core
npm run test

echo '\n>>> Testing disco-node\n'
cd $DIR/discojs-node
npm run test

echo '\n>>> Testing disco-web\n'
cd $DIR/discojs-web
npm run test
