# **DISCO** - _Dis_ tributed _Co_ llaborative Machine Learning



DISCO leverages federated :star2: and decentralized :sparkles: learning to allow several data owners to collaboratively build machine learning models without sharing any original data.

The latest version is always running on the following link, [directly in your browser](https://epfml.github.io/disco/), for web and mobile:

 :man_dancing: [https://epfml.github.io/disco/](https://epfml.github.io/disco/) :man_dancing:

___
:magic_wand: DEVELOPERS: Contribute or customize DISCO [HERE](DEV.md)
___

:question: **WHY DISCO?** 
- To build predictive models across private datasets without compromising data privacy, ownership, sovereignty, or model performance
- To create an easy-to-use platform that allows non-specialists to participate in collaborative learning

___

:gear: **HOW DISCO WORKS**
- DISCO has a *public model – private data* approach
- Private and secure model updates – *not data* – are communicated to either:
	- a central server : **FEDERATED** learning ( :star2: )
	- directly between users : **DECENTRALIZED** learning ( :sparkles: ) i.e. no central coordination
- Model updates are then aggregated into a trained model
- See more [HERE](https://epfml.github.io/disco/#/information)

___
:question: **DISCO TECHNOLOGY** 
- DISCO supports arbitrary deep learning tasks and model architectures, via [TF.js](https://www.tensorflow.org/js)
- :sparkles: relies on [peer2peer](https://peerjs.com/) communication
- Learn more about secure aggregation and differential privacy for privacy-respecting training [HERE](information/PRIVACY.md)

___

:test_tube: **RESEARCH-BASED DESIGN** 

DISCO aims to enable open-access and easy-use distributed training which is
- :tornado: efficient ([R1](https://github.com/epfml/powergossip), [R2](https://github.com/epfml/ChocoSGD)) 
- :lock: privacy-preserving ([R3](https://eprint.iacr.org/2017/281.pdf), [R4](https://arxiv.org/abs/2006.04747))
- :hammer_and_wrench: fault-tolerant and dynamic over time ([R5](https://arxiv.org/abs/1910.12308))
- :ninja:: robust to malicious actors and data poisoning ([R6](https://arxiv.org/abs/2012.10333), [R7](https://arxiv.org/abs/2006.09365))
- :apple: :banana: interpretable in imperfectly interoperable data distributions ([R8](https://arxiv.org/abs/2107.06580))
- :mirror: personalizable  ([R9](https://arxiv.org/abs/2103.00710))
- :carrot: fairly incentivizes participation


___


:checkered_flag: **HOW TO USE DISCO**
- Start by exploring our example *DISCOllaboratives* in the `Tasks` tab. 
- The example models are based on popular datasets such as [Titanic](https://www.kaggle.com/c/titanic), [MNIST](https://www.kaggle.com/c/digit-recognizer) or [CIFAR-10](https://www.kaggle.com/pankrzysiu/cifar10-python)
- It is also (SOON!) possible to create a custom task without coding. Just upload the following 2 files:
	- A `TensorFlow.js` model file in JSON format (useful links to [create](https://www.tensorflow.org/js/guide/models_and_layers) and [save](https://www.tensorflow.org/js/guide/save_load) your model)
	- A weight file in `.bin` format
		- These are the initial weights provided to new users joining your task (pre-trained or random initialisation) 
	- You can choose from several existing dataloaders
	- Then...select your DISCO training scheme (:star2: or :sparkles:) ... connect your data and... :bar_chart:

> **Note**: Currently only `CSV` and `Image` data types are supported. Adding new data types, preprocessing code or dataloaders, is accessible in developer mode (see [developer guide](https://github.com/epfml/disco/blob/develop/DEV.md)). Specific instructions on how to build a custom task can be found [HERE](information/TASK.md)

__

**JOIN US** 
- You are welcome on [slack](https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw)
