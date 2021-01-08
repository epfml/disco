import argparse
import zmq
import json

peer_list = []

# Parse command line arguments about server port number.
parser = argparse.ArgumentParser(description='DeAI server')
parser.add_argument('--port', default='5555', metavar='N',
                    help='input server port number (default: 5555)')
args = parser.parse_args()
port = args.port
print('Starting the server, port number', port)

# Bind the socket
context = zmq.Context()
socket = context.socket(zmq.REP)
socket.bind('tcp://*:' + port)

# Waiting for peers to connect
while True:
    try:
        print("Wait for clients ...")
        addr_message = socket.recv().decode('utf-8')
        print("Received address message from client", addr_message)
        if addr_message not in peer_list:
            peer_list.append(addr_message)
        socket.send(json.dumps(peer_list).encode('utf-8'))
        print("Peer list sent to client", addr_message)
    except Exception as e:
        print('Exception:', e)
        sys.exit()
