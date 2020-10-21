To use the file `index.html`, open it in two browser tabs, register with different usernames and then you can send messages by typing the id of the receiver and the message 
and clicking Send.


There are several options for the backend communication. The simplest thing is to use the public server without a STUN/TURN server. To use this option, use the following line
for the initialization of the Peer object:

```
peer = new Peer(username)
```

The best option is to host your own peerJS and TURN servers. 

To host the peerJS server, you need to do the following steps:

1. Follow steps 1-4 in this [tutorial](https://ourcodeworld.com/articles/read/977/how-to-deploy-a-node-js-application-on-aws-ec2-server) 
to create an EC2 instance and install Node.js on it. 
2. Install and run the server by following the official installation [instructions](https://github.com/peers/peerjs-server#run-server)
3. Open port 9000 on the EC2 instance. To open a port on AWS, follow the instruction from point 6 in this [tutorial](https://ourcodeworld.com/articles/read/977/how-to-deploy-a-node-js-application-on-aws-ec2-server)
4. Replace `<aws-instance-public-ip>` in the code with the public IP address of your EC2 instance.  

To host your own TURN server, you can follow the same procedure from point 1 to create and ssh into your EC2 instance. After you ssh into the EC2 instance, you need to install
coturn using the following commands:

```
$ sudo apt-get update
$ sudo apt-get install coturn
```

Then, you need to open the following ports on the AWS instance:

```
80 : TCP 
443 : TCP 
3478 : UDP
3478 : TCP
10000–20000 : UDP
```

For instructions on how to do this, see point 3 in the instructions for running the peerJS server above. 

To run the TURN server, use the following command:

```
turnserver -a -v -n -u <username>:<password> -p 3478 -r myRealm -X <aws-instance-public-ip> --no-dtls --no-tls
```

Don't forget to replace `<username>`, `<password>` and `<aws-instance-public-ip>` with appropriate values. You should now be able to use the TURN server. 

By default, the code uses both a personal peerjs server and turn server. Please update the username, password and public IP address in the appropriate places in the code. 

To disable the usage of a turn server, you can remove the `config` property from the intitialization of the `Peer` object. 

