# Secure Multiparty Aggregation for Decentralized Training

### Algorithm description
Additive sharing (you can read more about this algorithm [HERE](https://www.geeksforgeeks.org/additive-secret-sharing-and-share-proactivization-using-python/?ref=rp)
) is implemented with each client's gradients when the gradient is sent to all other clients connected in this round of multiparty training. The algorithm has four steps:
1. Each client will send a "ready message" to the signaling server, indicating that they are done with training and ready to be connected to other clients in order to aggregate weights. Each client pauses aggregation until they have received a list of peers to connect to.
2. Once the client has a list of peers, they will generate *n* shares, where _n_ is the number of clients (including themself) who will receive a share in order to be a part of this round of secure aggregation. Each client will receive 1 share from each other client. Each client will then have _n_ shares.
3. The client waits until they receive all _n_ shares (they are connected to themself as a peer, so they will receive a share from themself, as well), and when they do, they sum their shares together to create a _partial sum_ of all gradients. The client will then send this _partial sum_ to all peers that they are connected to.
4. The client waits until they receive _n_ partial sums. When they receive all sums, they aggregate these sums and return the final gradient updates.
### Privacy Guarantees
Currently, if the gradient value exceeds an absolute value of 50, privacy of gradient values is sacrificed for precision of smaller gradient values. Additionally, it is
worth noting that the addition or subtraction between values that are drastically different in magnitude (i.e. 100,000 and .0001) sacrifices the precision of the returned 
gradient update.

### User Input
The user can specify how many clients they want to be connected to before secure multiparty aggregation commences. This minimum number must be the same
as the other minimum connection number for the other clients that will be involved in that round of secure aggregation. Additionally, the user can define their 
own noise value (the noise generated in additive shares that will be sent to connected clients in the training round), but it is worth noting that a noise value that 
is too large in comparison to the gradient values will sacrifice the precision of the aggregated gradients. Similarly, a noise value that is too small will sacrifice privacy
guarantees.
