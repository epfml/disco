# **DISCO** - DIStributed COllaborative Machine Learning



DISCO leverages federated :star2: and decentralized :sparkles: learning to allow several data owners to collaboratively build machine learning models without sharing any original data.

The latest version is always running on the following link, [directly in your browser](https://discolab.ai/), for web and mobile:

 :man_dancing: [https://discolab.ai/](https://discolab.ai/) :man_dancing:

___
:magic_wand: DEVELOPERS: DISCO is written fully in JavaScript/TypeScript. Have a look at our [developer guide](DEV.md).
___

:question: **WHY DISCO?** 
- To build deep learning models across private datasets without compromising data privacy, ownership, sovereignty, or model performance
- To create an easy-to-use platform that allows non-specialists to participate in collaborative learning

___

:gear: **HOW DISCO WORKS**
- DISCO has a *public model – private data* approach
- Private and secure model updates – *not data* – are communicated to either:
	- a central server : **federated** learning ( :star2: )
	- directly between users : **decentralized** learning ( :sparkles: ) i.e. no central coordination
- Model updates are then securely aggregated into a trained model
- See more [HERE](https://discolab.ai/#/information)

___
:question: **DISCO TECHNOLOGY** 
- DISCO supports arbitrary deep learning tasks and model architectures in your browser via [TF.js](https://www.tensorflow.org/js)
- Decentralized learning :sparkles: relies on [peer2peer](https://github.com/feross/simple-peer) communication
- Have a look at how DISCO ensures privacy and confidentiality [HERE](docs/PRIVACY.md)

___

:test_tube: **RESEARCH-BASED DESIGN** 

DISCO leverages latest research advances, enabling open-access and easy-use distributed training which is
- :tornado: efficient ([R1](https://github.com/epfml/powergossip), [R2](https://github.com/epfml/ChocoSGD)) 
- :lock: privacy-preserving ([R3](https://eprint.iacr.org/2017/281.pdf), [R4](https://arxiv.org/abs/2006.04747))
- :hammer_and_wrench: fault-tolerant and dynamic over time ([R5](https://arxiv.org/abs/2106.06639), [R6](https://arxiv.org/abs/2206.08307))
- :ninja: robust to malicious actors and data poisoning ([R7](https://arxiv.org/abs/2012.10333), [R8](https://arxiv.org/abs/2006.09365))
- :apple: :banana: interpretable in imperfectly interoperable data distributions ([R9](https://arxiv.org/abs/2107.06580))
- :mirror: personalizable  ([R10](https://arxiv.org/abs/2103.00710))
- :carrot: fairly incentivizing participation


___


:checkered_flag: **HOW TO USE DISCO**
- Start by exploring our examples tasks in the [`DISCOllaboratives` page](https://discolab.ai/#/list). 
- The example DISCOllaboratives are based on popular ML tasks such as [GPT2](https://d4mucfpksywv.cloudfront.net/better-language-models/language-models.pdf), [Titanic](https://www.kaggle.com/c/titanic), [MNIST](https://www.kaggle.com/c/digit-recognizer) or [CIFAR-10](https://www.kaggle.com/pankrzysiu/cifar10-python)
- It is also possible to create your own DISCOllaboratives without coding on the [custom training page](https://discolab.ai/#/create):
	- Upload the initial model
	- Choose between federated and decentralized for your DISCO training scheme ... connect your data and... done! :bar_chart:
	- For more details on ML tasks and custom training have a look at [this guide](./docs/TASK.md)
