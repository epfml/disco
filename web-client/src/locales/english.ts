export default {
  home: {
    title: {
      name: 'Disco',
      start: 'Distributed ',
      middle: 'Collaborative ',
      end: 'AI'
    },
    buildCard: [
      {
        header: {
          text: 'Build AI with collaborators but',
          underlined: 'without sharing any data'
        },
        items: [
          "Exchange <span class='italic'>models</span> not data",
          'Keep data at its source',
          "choose either <span class='italic'>decentralised</span> or <span class='italic'>federated</span> training"
        ]
      }
    ],
    taskCard: [
      {
        header: {
          text: 'Create your',
          underlined: 'own task'
        },
        items: [
          'Choose a model',
          'Describe the task',
          'Specify the desired training and evaluation parameters '
        ]
      }
    ],
    startBuildingButtonText: 'Start building',
    createTaskButtonText: 'Create task'
  },
  information: {
    informationTitle: 'Further Information',
    informationCard: [
      {
        title: 'Goal:',
        text: 'Disco enables collaborative and privacy-preserving training of machine learning models. Disco is an easy-to-use mobile app & web software, running directly in your browser.'
      },
      {
        title: 'Key Question:',
        text: 'Can we keep control over our own data, while still benefitting from joint collaborative training with other participants? - or - Can we train an ML model which is equally good as if all data were in one place, but while respecting privacy? Federated and decentralized learning make this possible.'
      },
      {
        title: 'Federated learning:',
        text: 'The key insight is to share weight updates instead of data - each user trains on their own device and periodically shares weight updates with a central server, while keeping data local at all times. The server will agreggate all these weights between participants, and send them back.'
      },
      {
        title: 'Decentralized learning:',
        text: 'Building upon the same principles as in federated learning, decentralized learning achieved allows collaboration and data privacy without the need for a central coordinator. Updates are shared purely via peer2peer communication. Disco puts users in control of the entire collaborative training process, without a central point of failure.'
      }
    ],
    featuresTitle: 'Why use Disco?',
    featuresCard: [
      {
        title: 'Supports arbitrary deep learning architectures',
        text: 'Disco supports arbitrary deep learning tasks and model architectures, running on your device via TensorFlow.js'
      },
      {
        title: 'Data and model privacy',
        text: 'Data privacy by design - no data ever leaves any device. Models updates can be protected by encryption (secure multiparty computation), and by differential privacy'
      },
      {
        title: 'Runs anywhere',
        text: 'Disco runs in the browser, from any device equipped with a modern browser. For developers, we also offer a standalone node.js version, not needing any browser.'
      }
    ],
    howToUseTitle: 'How to use Disco?',
    howToUseCard: [
      {
        title: 'Step 1: Select a task',
        text: '- choose different tasks and data sets for training, ranging from tabular data to images, and from binary classification to class-wise prediction (or define your own task).'
      },
      {
        title: 'Step 2: Select data for the training process',
        text: '- choose the files that are used for the training process on your local devices. Those files will not be uploaded anywhere.'
      },
      {
        title: 'Step 3: Neural network training',
        text: '- select between training alone and training collaboratively. Local training will fine tune the model with your local data and the resulting model will only be available to your device. Training collaboratively will allow communication between local devices during training so the local model updatess are aggregated into an improved shared model. After completing training, you can find training statistics on the model accuracy in the dashboard. For training collaboratively, details on the communication rounds will also appear on the board.'
      },
      {
        title: 'Step 4: Save the model',
        text: '- click on the button to save the model for later.'
      },
      {
        title: 'Step 5: Reuse the model',
        text: '- come back any time to reuse your local model and resume training or test it against other data.'
      }
    ],
    federatedTitle: 'Federated Learning',
    decentralisedTitle: 'Decentralized Learning'
  },
  training: {
    trainingFrame: {
      dataExample: 'Data Example',
      localTrainingButton: 'Train Locally',
      collaborativeTrainingButton: 'Train Collaboratively',
      decentralizedTrainingButton: 'Train Decentralized',
      federatedTrainingButton: 'Train Federated',
      stopTrainingButton: 'Stop Training',
      saveModel: {
        header: 'Save the model',
        description: "If you are satisfied with the performance of the model, don't forget to save the model by clicking on the button below. The next time you will load the application, you will be able to use your saved model.",
        button: 'Save my model'
      },
      testModel: {
        header: 'Test the model',
        description: "If you are satisfied with the performance of the model, don't forget to save the model by clicking on the button below. The next time you will load the application, you will be able to use your saved model.",
        button: 'Test my model'
      }
    },
    trainingInformationFrame: {
      accuracyCharts: {
        validationAccuracyHeader: 'Validation Accuracy of the Model',
        validationAccuracyText: '% of validation accuracy',
        trainingAccuracyHeader: 'Training Accuracy of the Model',
        trainingAccuracyText: '% of training accuracy'
      },
      trainingInformations: {
        trainingConsoleHeader: 'Peer Training Console',
        distributed: {
          averaging: '# of Averaging',
          waitingTime: 'Waiting Time',
          weightRequests: '# Weight Requests',
          peopleHelped: '# of People Helped'
        },
        federated: {
          round: 'Current Round',
          numberParticipants: 'Current # of participants',
          averageParticipants: 'Average # of Participants'
        }
      }
    }
  }
}
