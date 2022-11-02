import * as yup from 'yup'

export interface FormElement {
  key: string
  default: string
}

export interface FormDependency {
  dataType?: string
  scheme?: string
}

export interface FormField {
  id: string
  name: string
  yup: yup.AnySchema
  as?: 'input' | 'textarea'
  type: 'text' | 'select' | 'select-multiple' | 'checkbox' | 'number' | 'float' | 'array' | 'arrayObject' | 'file'
  options?: string[]
  default?: string | boolean | string[] | boolean[]
  elements?: FormElement[]
  dependencies?: FormDependency
  extension?: '.bin' | '.json'
  description?: string
}

export interface FormSection {
  id: string
  title: string
  fields: FormField[]
}

const otherReq = (req: any) => {
  return {
    is: req,
    then: (schema: yup.AnySchema) => schema.required()
  }
}

const generalInformation: FormSection = {
  id: 'generalInformation',
  title: 'General Information',
  fields: [
    {
      id: 'taskID',
      name: 'Task IDentifier',
      yup: yup.string().required(),
      as: 'input',
      type: 'text',
      default: 'cifar10'
    },
    {

      id: 'dataType',
      name: 'Data Type',
      yup: yup.string().required(),
      as: 'input',
      type: 'select',
      options: ['Image (.png, .jpg)', 'Tabular (.csv)'],
      default: 'Image (.png, .jpg)'
    },
    {
      id: 'scheme',
      name: 'Training Scheme',
      yup: yup.string().required(),
      as: 'input',
      type: 'select',
      options: ['Decentralized', 'Federated'],
      default: 'Decentralized'
    }
  ]
}
const displayInformation: FormSection = {
  id: 'displayInformation',
  title: 'Display Information',
  fields: [
    {
      id: 'taskTitle',
      name: 'Title',
      yup: yup.string().required(),
      as: 'input',
      type: 'text',
      default: 'MNIST'
    },
    {
      id: 'preview',
      name: 'Preview',
      yup: yup.string(),
      as: 'textarea',
      type: 'text',
      default:
        "Test our platform by using a publicly available <b>image</b> dataset. <br><br> Download the classic MNIST imagebank of hand-written numbers <a class='underline text-primary-dark dark:text-primary-light' href='https://www.kaggle.com/scolianni/mnistasjpg'>here</a>. <br> This model learns to identify hand written numbers."
    },
    {
      id: 'overview',
      name: 'Overview',
      yup: yup.string(),
      as: 'textarea',
      type: 'text',
      default:
        'The MNIST handwritten digit classification problem is a standard dataset used in computer vision and deep learning. Although the dataset is effectively solved, we use it to test our Decentralised Learning algorithms and platform.'
    },
    {
      id: 'model',
      name: 'Model Description',
      yup: yup.string(),
      as: 'textarea',
      type: 'text',
      default:
        'The current model is a very simple CNN and its main goal is to test the app and the Decentralizsed Learning functionality.'
    },
    {
      id: 'tradeoffs',
      name: 'Tradeoffs',
      yup: yup.string(),
      as: 'textarea',
      type: 'text',
      default:
        'We are using a simple model, first a 2d convolutional layer > max pooling > 2d convolutional layer > max pooling > convolutional layer > 2 dense layers.'
    },
    {
      id: 'dataFormatInformation',
      name: 'Data Format Information',
      yup: yup.string(),
      as: 'textarea',
      type: 'text',
      default:
        'This model is trained on images corresponding to digits 0 to 9. You can upload each digit image of your dataset in the box corresponding to its label. The model taskes images of size 28x28 as input.'
    },
    {
      id: 'dataExampleText',
      name: 'Data Example Text',
      yup: yup.string(),
      as: 'input',
      type: 'text',
      default:
        'Below you can find an example of an expected image representing the digit 9.'
    },
    {
      id: 'dataExample',
      name: 'Data Example',
      yup: yup
        .array()
        .of(
          yup
            .object()
            .shape({
              columnName: yup.string().required().label('Column Name'),
              columnData: yup.string().required().label('Column Data')
            })
            .required()
        )
        .strict(),
      as: 'input',
      type: 'arrayObject',
      elements: [
        {
          key: 'columnName',
          default: 'PassengerID'
        },
        {
          key: 'columnData',
          default: '1'
        }
      ],
      dependencies: {
        dataType: 'tabular'
      }
    },
    {
      id: 'dataExampleImage',
      name: 'Data Example',
      yup: yup.string(),
      as: 'input',
      type: 'text',
      default: './9-mnist-example.png',
      dependencies: {
        dataType: 'image'
      }
    }
  ]
}

const trainingInformation: FormSection = {
  id: 'trainingInformation',
  title: 'Training Information',
  fields: [
    {
      id: 'modelID',
      name: 'Model IDentifier',
      yup: yup.string().required(),
      as: 'input',
      type: 'text',
      default: 'mnist-model'
    },
    {
      id: 'epochs',
      name: 'Epochs',
      yup: yup.number().integer().positive().required(),
      as: 'input',
      type: 'number',
      default: '10'
    },
    {
      id: 'validationSplit',
      name: 'Validation split',
      yup: yup.number().positive().lessThan(1).required(),
      as: 'input',
      type: 'float',
      default: '0.2'
    },
    {
      id: 'batchSize',
      name: 'Batch size',
      yup: yup.number().integer().positive().required(),
      as: 'input',
      type: 'number',
      default: '30'
    },
    {
      id: 'learningRate',
      name: 'Learning rate',
      yup: yup.number().positive().required(),
      as: 'input',
      type: 'float',
      default: '0.05'
    },
    {
      id: 'modelTrainData',
      name: 'Model Train Data',
      yup: yup
        .array()
        .of(
          yup
            .object()
            .shape({
              trainingParameter: yup
                .string()
                .required()
                .label('Training Parameter'),
              value: yup.string().required().label('Value')
            })
            .required()
        )
        .strict(),
      as: 'input',
      type: 'arrayObject',
      elements: [
        {
          key: 'trainingParameter',
          default: 'epochs'
        },
        {
          key: 'value',
          default: '10'
        }
      ]
    },
    {
      id: 'receivedMessagesThreshold',
      name: 'Received Messages Threshold',
      yup: yup.number().when('scheme', otherReq('decentralized')),
      as: 'input',
      type: 'number',
      default: '1',
      dependencies: {
        scheme: 'decentralized'
      }
    },
    {
      id: 'outputColumn',
      name: 'Output Column',
      yup: yup.string().when('dataType', otherReq('tabular')),
      as: 'input',
      type: 'text',
      default: 'Survived',
      dependencies: {
        dataType: 'tabular'
      }
    },
    {
      id: 'inputColumn',
      name: 'Input Column',
      yup: yup.array().of(yup.string()).min(1),
      as: 'input',
      type: 'array',
      default: 'PassengerID',
      dependencies: {
        dataType: 'tabular'
      }
    },
    {
      id: 'threshold',
      name: 'Threshold',
      yup: yup.number().integer().positive().required(),
      as: 'input',
      type: 'number',
      default: '1'
    },
    {
      id: 'IMAGE_H',
      name: 'Height of Image (pixels)',
      yup: yup.number().integer().positive().when('dataType', otherReq('image')),
      as: 'input',
      type: 'number',
      default: '28',
      dependencies: {
        dataType: 'image'
      }
    },
    {
      id: 'IMAGE_W',
      name: 'Width of Image (pixels)',
      yup: yup.number().integer().positive().when('dataType', otherReq('image')),
      as: 'input',
      type: 'number',
      default: '28',
      dependencies: {
        dataType: 'image'
      }
    },
    {
      id: 'LABEL_LIST',
      name: 'List of labels',
      yup: yup.array().of(yup.string()).min(1),
      as: 'input',
      type: 'array',
      default: '0'
    },
    {
      id: 'LABEL_ASSIGNMENT',
      name: 'List of labels',
      yup: yup
        .array()
        .of(
          yup
            .object()
            .shape({
              stringLabel: yup.string().required().label('Label (string)'),
              intLabel: yup.string().required().label('Label (int)')
            })
            .required()
        )
        .strict(),
      as: 'input',
      type: 'arrayObject',
      elements: [
        {
          key: 'stringLabel',
          default: 'airplane'
        },
        {
          key: 'intLabel',
          default: '1'
        }
      ]
    }
  ]
}

const modelCompileData: FormSection = {
  id: 'modelCompileData',
  title: 'Model Compile Data',
  fields: [
    {
      id: 'optimizer',
      name: 'Optimizer',
      yup: yup.string().required(),
      type: 'select',
      options: [
        'sgd',
        'momentum',
        'adagrad',
        'adadelta',
        'adam',
        'adamax',
        'rmsprop'
      ],
      default: 'rmsprop'
    },
    {
      id: 'loss',
      name: 'Loss',
      yup: yup.string().required(),
      type: 'select',
      options: [
        'binaryCrossentropy',
        'categoricalCrossentropy',
        'absoluteDifference',
        'computeWeightedLoss',
        'cosineDistance',
        'hingeLoss',
        'huberLoss',
        'logLoss',
        'meanSquaredError',
        'sigmoidCrossEntropy',
        'softmaxCrossEntropy'
      ],
      default: 'categoricalCrossentropy'
    },
    {
      id: 'metrics',
      name: 'Metrics (multiple can be selected)',
      yup: yup.array().of(yup.string()).min(1).required(),
      type: 'select-multiple',
      options: [
        'accuracy',
        'binaryAccuracy',
        'binaryCrossentropy',
        'categoricalAccuracy',
        'categoricalCrossentropy',
        'cosineProximity',
        'meanAbsoluteError',
        'meanAbsolutePercentageError',
        'meanSquaredError',
        'precision',
        'recall',
        'sparseCategoricalAccuracy'
      ],
      default: ['accuracy']
    }
  ]
}

const modelFiles: FormSection = {
  id: 'modelFiles',
  title: 'Model Files',
  fields: [
    {
      id: 'modelURL',
      name: 'Model URL',
      description: 'URL endpoint serving the initial model files. See <a class="text-disco-cyan hover:text-disco-blue" target="_blank" href="https://www.tensorflow.org/js/guide/save_load#https">TF.js docs</a> for more information.',
      type: 'text',
      yup: yup
        .string()
        .when(['modelFile', 'weightsFile'], otherReq((value: string) => !value)),
      default: 'https://example.com/model.json'
    },
    {
      id: 'modelFile',
      name: 'Alternatively: Model File',
      description: 'TensorFlow.js Model in JSON format',
      type: 'file',
      yup: yup.string().when('modelURL', otherReq((value: string) => !value)),
      extension: '.json',
      default: 'model.json'
    },
    {
      id: 'weightsFile',
      name: 'Alternatively: Initial Weights File',
      description: 'TensorFlow.js Model Weights in .bin format',
      type: 'file',
      yup: yup.string().when('modelURL', otherReq((value: string) => !value)),
      extension: '.bin',
      default: 'weights.bin'
    }
  ]
}

export const sections: FormSection[] = [
  generalInformation,
  displayInformation,
  trainingInformation,
  modelCompileData,
  modelFiles
]

export interface FormProps {
  section: FormSection
}
