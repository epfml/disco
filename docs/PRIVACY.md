# Privacy protection measures

In federated and decentralized learning, a client's data is never sent to another machine. However, some information could be inferred about a client's data set even when data isn't shared. For instance, summary statistics or even the existence of a specific data point can be inferred from sources such as:
1. the weights of the public and collaborative model ([Carlini et al., 2019](https://www.usenix.org/conference/usenixsecurity19/presentation/carlini));
2. the model updates shared by the client ([Bonawitz et al., 2017](https://doi.org/10.1145/3133956.3133982)).

In addition to the intrinsic security of federated and decentralized learning, DISCO ensures privacy and security via two different and complementary methods: 
1. Differential privacy ([McMahan et al., 2018](http://arxiv.org/abs/1710.06963) and [Abadi et al., 2016](https://doi.org/10.1145/2976749.2978318)), and
2. Secure aggregation of model updates ([Bonawitz et al., 2017](https://doi.org/10.1145/3133956.3133982)).

## Differential privacy

Differential privacy methods protect any dataset(s) used in the training of a machine learning (ML) model, from inference attacks based on the weights of the resulting ML model.

The respective parameters `epsilon`, `delta`, and `clippingRadius` are available in the [task configuration](TASK.md).

### What is Differential Privacy?
Differential privacy (DP) is a rigorous privacy framework that provides a privacy guarantee by ensuring that an algorithm's output does not significantly change when a single data point in the dataset is modified. This protection is achieved by adding carefully calibrated random values (called "noise") to the data or model updates.

In DISCO, differential privacy ensures privacy by making sure that the weight updates produced by one client do not significantly change when a single data point in that client's dataset is modified. This is called local differential privacy (LDP). Before sharing weight updates with the server, random noise is added to these updates. By examining only the weight updates that each client sends to the server, no party, including the server, can infer who generated a specific update or which datasets particular clients have.

Differential privacy has an key parameter, epsilon($\epsilon$), which indicates the privacy level applied to the learning process. It is also called the "privacy budget."

### Parameter Explanations
Differential privacy is achieved by adding noise. To guarantee your desired privacy level, you need to specify several parameters:

`epsilon`
- This is the privacy budget. The smaller the $\epsilon$ value, the stronger the privacy protection. In DISCO, this $\epsilon$ value indicates the privacy guarantee for a single client.

`delta` 
- This parameter indicates the failure pobability of the privacy guarantee. It is used in approximate differential privacy, which DISCO implemented.

`clipping radius`
- This parameter sets the maximum bound for the adaptive clipping radius.

### Privacy-utility trade-off
The utility degradation that follows from improving privacy is an inherent feature of differential privacy, so you must consider this when choosing your $\epsilon$ value. When $\epsilon$ equals 0, this guarantees perfect privacy but zero utility. As $\epsilon$ approaches infinity, privacy becomes zero and full utility is recovered. As $\epsilon$ decreases, utility degrades gradually.

When we repetitively run the same private algorithm, the privacy budget accumulates, resulting in a larger final privacy budget that indicates a weaker privacy guarantee. This is called "composition" of privacy budget. This applies to DP in DISCO: since we add noise to weight updates at every epoch, the privacy budget accumulates with each epoch. The accumulation rate is determined by the total number of epochs defined in the task configuration.

### What is the best $\epsilon$ value?
Choosing an appropriate $\epsilon$ value depends on your specific use case and requires careful consideration of the privacy-utility trade-off.

- For local differential privacy (LDP), which DISCO implements, meaningful utility typically requires larger $\epsilon$ values compared to central differential privacy. In practice, LDP implementations often use $\epsilon$ values ranging from 5 to 20. Some implementations may use higher values, though this comes with weaker privacy guarantee.
- Lower $\epsilon$ values (closer to 1) provide stronger privacy guarantees but may significantly reduce model accuracy or utility, which can make the final result meaningless.
- Higher $\epsilon$ values (above 20) may provide better model performance but offer weaker privacy protection.

- The approapriate $\epsilon$ value for your task depends on several factors as below.
   - Your acceptable level of model accuracy degradation
   - The number of rounds (due to privacy budget composition over rounds)

- To provide context, here are examples of $\epsilon$ values used in real-world deployments:
   - Apple's local differential privacy implementation for iOS and macOS uses $\epsilon$ = 16 for QuickType suggestions, with a privacy unit of user per day ([Apple Differential Privacy Overview](https://www.apple.com/privacy/docs/Differential_Privacy_Overview.pdf))
   - Microsoft's Windows telemetry collection uses local differential privacy with $\epsilon$ = 1.672, with a privacy unit of user per 6 hours ([Ding et al., 2017](https://www.microsoft.com/en-us/research/publication/collecting-telemetry-data-privately/))

### DISCO's Differential Privacy Implementation
Since model weights are shared for aggregation to converge to a final model in DISCO, we add DP noise to weight updates before sharing them with server or other clients. This noise is calibrated with an interaction between $\epsilon$, $\delta$, and `clipping_radius`. 


To carefully calibrate the smallest possible noise for a given privacy guarantee, we implement window-based adaptive local differential privacy(ALDP). The ALDP process works as follows.
   1. Each round, before sharing the weight update with the server, we calibrate the noise using $\epsilon$, $\delta$, and a new adaptive clipping radius, which is the mean value of the three previous weight updates. This helps us find the optimal clipping radius that avoids over-calibrating the noise needed for the privacy guarantee. 
   2. We add the calibrated noise to the current weight update and share it with the server.
   3. We store the weight update before noise addition to use for calibrating the clipping radius in the next round.

## Secure aggregation through MPC

DISCO protects the clients' data from inference attacks based on the model updates shared by the clients, by ensuring that an individual client's model update is never revealed. This is achieved by secure update aggregation, where multiple clients use secure multiparty computation (MPC) to jointly compute the sum of their model updates without revealing the summands.

In DISCO, we rely on secure aggregation of models / model updates, in each communication round, in order to fully protect the privacy of each user. 

### Concept: Private data - Public model

We guarantee input privacy of each personal update and each client's data. 
The model resulting from training is considered public, both in the federated and decentralized schemes.

### Set-up

Our secure aggregation mechanism is implemented in each communication round, within small aggregation groups of a minimum size, which are formed from clients available to exchange model updates. 

### Algorithm description

**Orchestration via client-server communication:**
1. The server keeps track of which clients are ready to share model weights with each other, in order to let them know when enough clients are ready.
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

DISCO secure aggregation guarantees input privacy for a client's model updates. Other users will not be able to reconstruct a client's individual data or model updates, see [Bonawitz et al., 2017](https://doi.org/10.1145/3133956.3133982) for more details.

It is worth noting that due to the current use of floating point arithmetic instead of finite fields implies an effect on the quantization of models. Alternatively quantized integer model weights (with scaling) can be used.
Currently, the additive shares generated at step 2 are filled with floating-point values drawn uniformly at random from the interval `[-maxShareValue, +maxShareValue)`.
- If `maxShareValue` is too small, privacy is lost because larger random numbers better obfuscate the secret. Indeed, for each client A, there is one other client who can construct a (1-e)-confidence-interval of size `maxShareValue*2`, where e is also monotonically increasing in `maxShareValue`.
- However, at the same time, as `maxShareValue` increases, the reconstruction problem becomes more ill-conditioned (subtraction of very large numbers to obtain a relatively small number). Indeed, given the finite precision of floating point number representations, every order of magnitude increase in `maxShareValue` increases the expected reconstruction error by one order of magnitude.

In practice, our current implementation introduces a reconstruction error on the order of `maxShareValue*10e-8`. The default value for the `maxShareValue` is set to `100`, so the random numbers are drawn uniformly from `[-100, 100)`.
Values far outside this interval are insufficiently protected, and the aggregated model update is reconstructed with an error on the order of `10e-6`.

### User Input

`minNbOfParticipants`

The user can specify the minimum number of clients that must participate in any secure aggregation procedure. This minimum should be greater than 2, because the participating clients can otherwise reconstruct each other's model updates by subtracting their own from the aggregated model update.
The value can be changed by modifying `minNbOfParticipants` in each task's trainingInformation. More information on the set-up of a task and task personalization
can be found [HERE](TASK.md).

`maxShareValue`

The user can change the size of the interval from which random numbers are drawn to fill the additive secret shares.
This allows the user to control the trade-off between accuracy and privacy.
Larger values for `maxShareValue` provide better privacy protection, while smaller values provide better reconstruction accuracy.
