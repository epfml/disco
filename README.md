# **DISCO** - DIStributed COllaborative Machine Learning



DISCO leverages federated :star2: and decentralized :sparkles: learning to allow several data owners to collaboratively build machine learning models without sharing any original data.

The latest version is always running on the following link, [directly in your browser](https://discolab.ai/), for web and mobile:

 :man_dancing: [https://discolab.ai/](https://discolab.ai/) :man_dancing:

___
:magic_wand: DEVELOPERS: Have a look at our [developer guide](DEV.md)
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
- DISCO supports arbitrary deep learning tasks and model architectures, via [TF.js](https://www.tensorflow.org/js)
- :sparkles: relies on [peer2peer](https://peerjs.com/) communication
- Have a look at how DISCO ensures privacy and confidentiality [HERE](docs/PRIVACY.md)

___

:test_tube: **RESEARCH-BASED DESIGN** 

DISCO aims to enable open-access and easy-use distributed training which is
- :tornado: efficient ([R1](https://github.com/epfml/powergossip), [R2](https://github.com/epfml/ChocoSGD)) 
- :lock: privacy-preserving ([R3](https://eprint.iacr.org/2017/281.pdf), [R4](https://arxiv.org/abs/2006.04747))
- :hammer_and_wrench: fault-tolerant and dynamic over time ([R5](https://arxiv.org/abs/1910.12308))
- :ninja: robust to malicious actors and data poisoning ([R6](https://arxiv.org/abs/2012.10333), [R7](https://arxiv.org/abs/2006.09365))
- :apple: :banana: interpretable in imperfectly interoperable data distributions ([R8](https://arxiv.org/abs/2107.06580))
- :mirror: personalizable  ([R9](https://arxiv.org/abs/2103.00710))
- :carrot: fairly incentivize participation


___


:checkered_flag: **HOW TO USE DISCO**
- Start by exploring our example *DISCOllaboratives* in the [`Tasks` page](https://discolab.ai/#/list). 
- The example models are based on popular datasets such as [Titanic](https://www.kaggle.com/c/titanic), [MNIST](https://www.kaggle.com/c/digit-recognizer) or [CIFAR-10](https://www.kaggle.com/pankrzysiu/cifar10-python)
- It is also possible to create your own task without coding on the [custom training page](https://discolab.ai/#/create):
	- Upload the initial model
	- You can choose from several existing dataloaders
	- Choose between federated and decentralized for your DISCO training scheme ... connect your data and... done! :bar_chart:
	- For more details on ML tasks and custom training have a look at [this guide](./docs/TASK.md)

> **Note**: Currently only `CSV` and `Image` data types are supported. Adding new data types, preprocessing code or dataloaders, is accessible in developer mode (see [developer guide](https://github.com/epfml/disco/blob/develop/DEV.md)).

__

**JOIN US** 
- You are welcome on [slack](https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw)
