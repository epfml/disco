const { PeerServer } = require('peer');
var topologies = require('./topologies.js')
var myArgs = process.argv.slice(2);

tree = new topologies.BinaryTree()
const peerServer = PeerServer({ port: myArgs[0], path: '/deai' });

peerServer.on('connection', (client) => { 
    tree.addPeer(client.getId())
    tree.printTree()
    console.log()
});

peerServer.on('disconnect', (client) => { 
    console.log('disconnect ', client.getId())
    tree.removePeer(client.getId())
    tree.printTree()
    console.log()
});






