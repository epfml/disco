# Secure Aggregation

### Algorithm description
Additive secret sharing is a standard form of secure multiparty computation. To read more about this algorithm, see e.g. [HERE](https://www.geeksforgeeks.org/additive-secret-sharing-and-share-proactivization-using-python/?ref=rp). In DisCo, we rely on secure aggregation of model updates, in each communication round, in order to fully protect the privacy of each model update. 

- Concept: Private data - Public model

We guarantee input privacy of each personal update and each client's data. 
The models resulting from training is considered public, both in the federated and decentralized modes.

- Secure Aggregation

Our secure aggregation mechanism is implemented in each communication round, within small aggregation groups of a minimum size, which are formed from clients available to exchange model updates. 

The secure aggregation method has four steps:
1. Each client will send a "ready message" to the signaling server, indicating that they are done with a round of local updates and ready to be connected to other clients in order to aggregate weights. Each client pauses aggregation until they have received a list of peers to connect to.
2. Once the client has a list of peers, they will generate *n* additive secret shares from their own update, where _n_ is the number of clients (including themself) who will receive a share in order to be a part of this round of secure aggregation. A share is generated out of the secret own model update. When all shares from one client are summed together, the original secret model update would be reconstructed. As such, the true model update value that needs to be kept private is masked with additive noise to ensure that no client can reconstruct the original individual update. Each client will receive 1 share from each other client. Each client will then have received _n_ shares.
3. The client waits until they receive all _n_ shares (they are connected to themself as a peer, so they will receive a share from themself, as well), and when they do, they sum their shares together to create a _partial sum_ of all gradients. The client will then send this _partial sum_ to all peers that they are connected to.
4. The client waits until they receive _n_ partial sums. When they receive all sums, they aggregate these sums and return the final updates.

### Privacy Guarantees
DisCo secure aggregation guarantees input privacy for a client's model updates. Other users will not be able to reconstruct the client's original model using this method of multiparty communication. 
It is worth noting that due to the current use of floating point arithmetic instead of finite fields, there is a trade-off between good privacy (privacy improves as the range for additive sharing values increases) and good accuracy (accuracy improves as the range for additive sharing values decreases) for a given update. If the range of numbers for which the additive shares can be generated
is too small, then the secret is not fully protected. In contrast, if the range is too large, the noise will eventually cancel out. However, the procedure involves adding noise to the secret and then subtracting the secret again. Our function to generate shares can represent numbers with 10 significant digits, and if the noise is more than 10e10 times the signal, then noise + signal ≃ noise so noise + signal - noise ≃ 0.
As such, when the range is too large, the final aggregated updates will lose precision.

We have a default noise range value set to 100-- the shares generated for each model update will be composed of real numbers uniformly chosen from -100 to 100. The model updates will still be correctly computed for values larger than this limit, but such larger values might leak a small amount of information that that particular weight of the neural net was of magnitude >100. No information is leaked for model weights <100 in absolute value.


Accuracy:
- Small model updates are still accurately transmitted up to magnitude 10e-6

### User Input
The user can specify how the minimum number of clients they want to be connected to before secure multiparty aggregation commences. This minimum should be at least 3 and can be defined as a custom value `minimumReadyPeers` in each task's trainingInformation. More information on the set-up of a task and task personalization
can be found [HERE](TASK.md).
Also, the user can define their own range of noise values used to mask the true updates (the noise generated in additive shares that will be sent to connected clients in the training round). As mentioned above, when using floating point, a noise value that  is too large in comparison to the gradient values can sacrifice precision of the aggregated gradients. Similarly, a noise value that is too small can sacrifice privacy
guarantees for model weights exceeding this magnitude.
