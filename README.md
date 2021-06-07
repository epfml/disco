# DeAI - Decentralized Collaborative Machine Learning

DeAI enables collaborative and privacy-preserving training of machine learning models.
DeAI is an easy-to-use mobile app & web software, [running directly in your browser](https://epfml.github.io/DeAI/).

**Key Question:** Can we keep control over your own data, while still benefitting from joint collaborative training with other participants? - or - Can we train an ML model which is equally good as if all data were in one place, but respect privacy?

**Decentralized learning:** makes this possible, following the same principles as in federated learning, but going one step further by removing any central coordinator. DeAI only uses [peer2peer](https://peerjs.com/) communication, while keeping your data local at all times. It puts users in control of the entire collaborative training process, without a central point of failure. We support all modern deep learning architectures running on device (currently via [TF.js](https://www.tensorflow.org/js)).

**Applications:** We're investigating many applications which could be enabled by DeAI, including from the medical domain. Currently we offer a predefined list of training tasks, but will facilitate creating new tasks for everyone soon. For now if you have a new application in mind, just send us a pull request.

**Join us:** We follow an open development process - you're more than welcome to join the conversation on [our slack space](https://join.slack.com/t/deai-workspace/shared_invite/zt-fpsb7c9h-1M9hnbaSonZ7lAgJRTyNsw), as well as on the issues pages here.

**Science behind DeAI:** In this project we aim to build and improve decentralized versions of current machine learning algorithms, which are at the same time (i) efficient ([R1](https://github.com/epfml/powergossip),[R2](https://github.com/epfml/ChocoSGD)), (ii) privacy-preserving ([R3](https://arxiv.org/abs/2006.04747)), (iii) fault-tolerant and dynamic over time ([R4](https://arxiv.org/abs/1910.12308)), (iv) robust to malicious actors ([R5](https://arxiv.org/abs/2012.10333),[R6](https://arxiv.org/abs/2006.09365)), and (iv) support fair incentives and transparency on the resulting utility of trained ML models. We currently follow a public model, private data approach.

The latest version of DeAI is always available on the following link, for mobile and desktop browsers: https://epfml.github.io/DeAI/
