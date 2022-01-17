# DeAI - Decentralized Collaborative Machine Learning

<<<<<<< HEAD
DeAI enables collaborative and privacy-preserving training of machine learning models. 
DeAI is easy-to-use mobile & web code. DeAI supports both federated and distributed learning. The latest version (without the federated option) of DeAI is currently running on the following link, [directly in your browser](https://epfml.github.io/DeAI/), for mobile and desktop:
 
  :rocket: https://epfml.github.io/DeAI/ :rocket:
=======
DeAI enables collaborative and privacy-preserving training of machine learning models. DeAI offers both decentralized and federated learning.
DeAI is easy-to-use mobile & web code. DeAI supports both federated and distributed learning. The latest version of DeAI is currently running on the following link, [directly in your browser](https://epfml.github.io/DeAI/), for mobile and desktop:

:rocket: https://epfml.github.io/DeAI/ :rocket:
>>>>>>> develop

**Key Question:** Can we keep control over our own data, while still benefitting from joint collaborative training with other participants? - or - Can we train an ML model which is equally good as if all data were in one place, but respect privacy?

**Federated learning:** The key insight is to share weights instead of data, each user trains on his own machine and periodically shares his learned weights with a central server. The server will agreggate all these weights and send them back. 
We support all modern deep learning architectures running on device (currently via [TF.js](https://www.tensorflow.org/js)).

**Decentralized learning:** makes this possible, following the same principles as in **federated learning**, but going one step further by removing any central coordinator. DeAI only uses [peer2peer](https://peerjs.com/) communication, while keeping your data local at all times. It puts users in control of the entire collaborative training process, without a central point of failure. We support all modern deep learning architectures running on device (currently via [TF.js](https://www.tensorflow.org/js)).

**Applications:** We're investigating many applications which could be enabled by DeAI, including from the medical domain. Currently we offer a predefined list of training tasks, but will facilitate creating new tasks for everyone soon. For now if you have a new application in mind, just send us a pull request.

**Join us:** We follow an open development process - you're more than welcome to join the conversation on [our slack space](https://join.slack.com/t/deai-workspace/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw), as well as on the issues pages here.

**Science behind DeAI:** In this project we aim to build and improve decentralized versions of current machine learning algorithms, which are at the same time (i) efficient ([R1](https://github.com/epfml/powergossip),[R2](https://github.com/epfml/ChocoSGD)), (ii) privacy-preserving ([R3](https://eprint.iacr.org/2017/281.pdf),[R4](https://arxiv.org/abs/2006.04747)), (iii) fault-tolerant and dynamic over time ([R5](https://arxiv.org/abs/1910.12308)), (iv) robust to malicious actors ([R6](https://arxiv.org/abs/2012.10333),[R7](https://arxiv.org/abs/2006.09365)), and (iv) support fair incentives and transparency on the resulting utility of trained ML models. We currently follow a public model, private data approach.

## How to use the platform

### Tasks

The platform already contains several **_popular tasks_** such as [Titanic](https://www.kaggle.com/c/titanic), [MNIST](https://www.kaggle.com/c/digit-recognizer) or [CIFAR-10](https://www.kaggle.com/pankrzysiu/cifar10-python).

New tasks can be created [the following form](https://epfml.github.io/DeAI/#/task-creation-form). To do so, practical information related to the task (e.g. description, features, learning rate, etc.) must be provided. Furthermore, two extra `TensorFlow.js` files need to be uploaded:

- A model file in `JSON` format. Please refer to the following official documentation pages to [create](https://www.tensorflow.org/js/guide/models_and_layers) and [save](https://www.tensorflow.org/js/guide/save_load) your model.
- A weight file in `.bin` format. These are the initial weights that will be provided to new users upon joining the training of your task. You can either provide a pre-trained model or use a simple random initialisation scheme.

> **Note**: for the moment, only `CSV` and `Image` data types are supported but stay tuned: it will soon be possible to add new types directly on the platform :mega:

### Settings

Under the sidebar on the left, you will find a **_settings_** button. We offer multiple personalisation options for the user. In particular:

1. **Platform type**: train `decentralised` or `federated` according to your needs :rocket: Be aware that changing the platform type during training will reset the state of the platform. In other words, your training progress will be lost :warning:
2. **Model library**: storage options can be enabled so that your models are safely saved in your browser database :floppy_disk:
3. **Themes and colors**: customise the look of the platform as you please :rainbow:

If you have any questions related to `DeAI` feel, free to raise an issue or join our [slack workspace](https://join.slack.com/t/deai-workspace/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw) :question:
