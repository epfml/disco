# Disco - Distributed Collaborative Machine Learning

Disco enables collaborative and privacy-preserving training of machine learning models. Disco offers both decentralized and federated learning.
Disco is easy-to-use mobile & web code. The latest version of Disco is always running on the following link, [directly in your browser](https://epfml.github.io/disco/), for mobile and desktop:

:rocket: <https://epfml.github.io/disco/> :rocket:

If you want to contribute to the development, or run your custom disco instance, please go to our [developer section](DEV.md)

**Key Question:** Can we keep control over our own data, while still benefitting from joint collaborative training with other participants? - or - Can we train an ML model which is equally good as if all data were in one place, but while respecting privacy? Federated and decentralized learning make this possible.

**Federated learning:** The key insight is to share weight updates instead of data - each user trains on their own device and periodically shares weight updates with a central server, while keeping data local at all times. The server will agreggate all these weights between participants, and send them back.

**Decentralized learning:** Building upon the same principles as in federated learning, decentralized learning allows collaboration and data privacy without the need for a central coordinator. Updates are shared purely via [peer2peer](https://peerjs.com/) communication. Disco puts users in control of the entire collaborative training process, without a central point of failure.

Disco supports arbitrary deep learning tasks and model architectures, running on your device via [TF.js](https://www.tensorflow.org/js).

**Applications:** Many applications can be enabled by Disco, including for example from the medical domain. In addition to a list of predefined training tasks, Disco allows to simply create new tasks, without any need for coding. Just specify your deep learning model and choose from several existing dataloaders.

**Join us:** We follow an open development process - you're more than welcome to join the conversation on [our slack space](https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw), see the info in our [developer section](DEV.md), as well as on the issues pages here.

**Science behind Disco:** In this project we aim to build and improve decentralized versions of current machine learning algorithms, which are at the same time (i) efficient ([R1](https://github.com/epfml/powergossip),[R2](https://github.com/epfml/ChocoSGD)), (ii) privacy-preserving ([R3](https://eprint.iacr.org/2017/281.pdf),[R4](https://arxiv.org/abs/2006.04747)), (iii) fault-tolerant and dynamic over time ([R5](https://arxiv.org/abs/1910.12308)), (iv) robust to malicious actors ([R6](https://arxiv.org/abs/2012.10333),[R7](https://arxiv.org/abs/2006.09365)), and (v) support fair incentives and transparency on the resulting utility of trained ML models. We currently follow a public model, private data approach.

## How to use the platform

### Tasks

The platform already hosts several popular **_example tasks_** such as [Titanic](https://www.kaggle.com/c/titanic), [MNIST](https://www.kaggle.com/c/digit-recognizer) or [CIFAR-10](https://www.kaggle.com/pankrzysiu/cifar10-python), both for federated or decentralized cases.

New tasks can easily be created using [the following form](https://epfml.github.io/disco/#/task-creation-form). To do so, practical information related to the task (e.g. description, features, learning rate, etc.) must be provided. Furthermore, two extra `TensorFlow.js` files need to be provided:

If you are a developer, you can find a detailed guide on how to build a custom task [here](./information/TASK.md).

- A model file in `JSON` format. Please refer to the following official documentation pages to [create](https://www.tensorflow.org/js/guide/models_and_layers) and [save](https://www.tensorflow.org/js/guide/save_load) your model.
- A weight file in `.bin` format. These are the initial weights that will be provided to new users upon joining the training of your task. You can either provide a pre-trained model or use a simple random initialisation scheme.

> **Note**: for the moment, `CSV` and `Image` data types are supported by default. If you want to add a completely new data type with its own preprocessing code or dataloader, currently you are required to copy and change the correspondig code (see [developer guide](DEV.md)).

### Settings

Under the sidebar on the left, you will find a **_settings_** button. We offer multiple personalisation options for the user. For example:

- **Model library**: storage options can be enabled so that your trained models are safely saved in your browser database :floppy_disk:

If you have any questions related to Disco, feel free to raise an issue or join our [slack workspace](https://join.slack.com/t/disco-decentralized/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw) :question:
