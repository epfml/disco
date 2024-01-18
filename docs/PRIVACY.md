# Privacy protection measures

In federated and decentralised learning, a client's data is never sent to another machine. However, some information could be inferred about a client's data set even when the data set is not shared. For instance, summary statistics or even the existence of a specific data point can be inferred from sources such as:
1. the weights of the public and collaborative model ([Carlini et al., 2019](https://www.usenix.org/conference/usenixsecurity19/presentation/carlini));
2. the model updates shared by the client ([Bonawitz et al., 2017](https://doi.org/10.1145/3133956.3133982)).

DisCo protects the clients' data beyond the simple use of federated and decentralised learning, using two different and complementary methods: 
1. Differential privacy ([McMahan et al., 2018](http://arxiv.org/abs/1710.06963) and [Abadi et al., 2016](https://doi.org/10.1145/2976749.2978318)), and
2. Secure aggregation of model updates ([Bonawitz et al., 2017](https://doi.org/10.1145/3133956.3133982)).

## Differential privacy

Differential privacy methods protect any dataset(s) used in the training of a machine learning (ML) model, from inference attacks based on the weights of the resulting ML model.

The respective parameters `noiseScale` and `clippingRadius` are available in the [task configuration](TASK.md).

## Secure aggregation through MPC

Disco protects the clients' data from inference attacks based on the model updates shared by the clients, by ensuring that an individual client's model update is never revealed. This is achieved by secure update aggregation, where multiple clients use secure multiparty computation (MPC) to jointly compute the sum of their model updates without revealing the summands.

In DisCo, we rely on secure aggregation of models / model updates, in each communication round, in order to fully protect the privacy of each user. 

### Concept: Private data - Public model

We guarantee input privacy of each personal update and each client's data. 
The model resulting from training is considered public, both in the federated and decentralised modes.

### Set-up

Our secure aggregation mechanism is implemented in each communication round, within small aggregation groups of a minimum size, which are formed from clients available to exchange model updates. 

### Algorithm description

**Orchestration via client-server communication:**
1. The helper server (signaling server) keeps track of which clients are ready to share model weights with each other, in order to let them know when enough clients are ready.
Thus, before the aggregation begins, there is a preliminary communication step between the clients and the server:
   1. Whenever a client finishes a round of local updates, it sends a "ready message" to the server to signal that it is ready to exchange model updates.
   2. Once enough clients are ready, the server sends them the list of clients to aggregate with.
   3. If the client receives the list of ready peers within a certain time frame after sending its "ready message", it begins the secure aggregation procedure.

The **secure aggregation procedure** consists of two rounds of all-to-all communication. In other words, two messages are sent from each member of the list of ready clients, to each member of the list of ready clients:

2. The client generates *n* additive secret shares from their own model update and sends them to the other clients.
   1. *n* is the number of clients participating in the aggregation procedure. Hence `len(list of ready clients) = n`.
   2. Each share has the same shape as the model weights. The *n* shares are generated at random under the constraint that their element-wise sum must be equal to the client's model update.
   3. Once it has generated *n* additive secret shares, the client sends one share to each client who is participating in the aggregation procedure (including to itself). Note that each individual client is unable to reconstruct any other client's model update, because the latter is independent from any strict subset of the set of all *n* shares generated from the model update.
   4. The client expects to receive *n* shares (one from each client on the list). If it receives all expected shares within a certain time frame, it moves on to the next step of the procedure.
3. The client has received one share from each client on the list.
   1. The client computes the sum of the received shares. We call it the _partial sum_. Note that the _partial sums_ computed by all of the clients add up to the sum of the clients' model updates, because every share is accounted for exactly once.
   2. The client then sends this _partial sum_ to all clients on the list.
   3. If the client receives all *n* partial sums within a certain time frame, it reconstructs the sum of the model updates of all clients on the list by computing the sum of the partial sums.

**Return value:**
- At steps 1.3, 2.4, or 3.3, if the client does not receive all expected message(s) by the end of the time frame, the aggregation round is considered to have failed and the algorithm returns the client's own model update (this value is returned to a local routine of the client).
- Otherwise, it returns the reconstructed sum of the model updates of all clients who participated in the aggregation procedure.

### Privacy guarantees and trade-off with quantization accuracy

DisCo secure aggregation guarantees input privacy for a client's model updates. Other users will not be able to reconstruct a client's individual data or model updates, see e.g. [https://eprint.iacr.org/2017/281.pdf](https://eprint.iacr.org/2017/281.pdf) for more details.

It is worth noting that due to the current use of floating point arithmetic instead of finite fields implies an effect on the quantization of models. Alternatively quantized integer model weights (with scaling) can be used.
Currently, the additive shares generated at step 2 are filled with floating-point values drawn uniformly at random from the interval `[-maxShareValue, +maxShareValue)`.
- If `maxShareValue` is too small, privacy is lost because larger random numbers better obfuscate the secret. Indeed, for each client A, there is one other client who can construct a (1-e)-confidence-interval of size `maxShareValue*2`, where e is also monotonically increasing in `maxShareValue`.
- However, at the same time, as `maxShareValue` increases, the reconstruction problem becomes more ill-conditioned (subtraction of very large numbers to obtain a relatively small number). Indeed, given the finite precision of floating point number representations, every order of magnitude increase in `maxShareValue` increases the expected reconstruction error by one order of magnitude.

In practice, our current implementation introduces a reconstruction error on the order of `maxShareValue*10e-8`. The default value for the `maxShareValue` is set to `100`, so the random numbers are drawn uniformly from `[-100, 100)`.
Values far outside this interval are insufficiently protected, and the aggregated model update is reconstructed with an error on the order of `10e-6`.

### User Input

`minimumReadyPeers`

The user can specify the minimum number of clients that must participate in any secure aggregation procedure. This minimum should be greater than 2, because the participating clients can otherwise reconstruct each other's model updates by subtracting their own from the aggregated model update.
The value is set to 3 by default and can be changed by modifying `minimumReadyPeers` in each task's trainingInformation. More information on the set-up of a task and task personalization
can be found [HERE](TASK.md).

`maxShareValue`

The user can change the size of the interval from which random numbers are drawn to fill the additive secret shares.
This allows the user to control the trade-off between accuracy and privacy.
Larger values for `maxShareValue` provide better privacy protection, while smaller values provide better reconstruction accuracy.
