import * as yup from 'yup'
/* form generator
         each section should contain :
            - `fields`  (general fields)
            - `tabular` (fields only relevant for tabular tasks)
            - `image`   (fields only relevant for image tasks)
            - `other`   (empty rendering which no data type has been chosens)
*/

// TODO better typing
type FormFieldDefault = string | string[] | boolean
type FormFieldElements = any

export interface FormField {
  id: string
  name: string
  yup: yup.AnySchema
  as?: 'input' | 'textarea'
  type: string
  options?: string[]
  default?: FormFieldDefault
  elements?: FormFieldElements
  extension?: '.bin' | '.json'
}

export interface FormSection {
  title: string
  id: string
  fields: FormField[]
  tabular: FormField[]
  image: FormField[]
  other: FormField[]
}

export const sections: FormSection[] = [
  // *** Section ***
  {
    title: 'General Information',
    id: 'generalInformation',
    fields: [
      {
        id: 'taskID',
        name: 'Task IDentifier',
        yup: yup.string().required(),
        as: 'input',
        type: 'text',
        default: 'eg. : minst'
      },
      {
        id: 'dataType',
        name: 'Data Type',
        yup: yup.string().required(),
        as: 'input',
        type: 'select',
        options: ['image (.png, .jpg)', 'tabular (.csv)', 'other'],
        default: 'eg. : other'
      }
    ],
    tabular: [],
    image: [],
    other: []
  },
  // *** Section ***
  {
    title: 'Display Information',
    id: 'displayInformation',
    fields: [
      {
        id: 'taskTitle',
        name: 'Title',
        yup: yup.string().required(),
        as: 'input',
        type: 'text',
        default: 'eg. : MNIST'
      },
      {
        id: 'preview',
        name: 'Preview',
        yup: yup.string().required(),
        as: 'textarea',
        type: 'textarea',
        default:
          "eg. : Test our platform by using a publicly available <b>image</b> dataset. <br><br> Download the classic MNIST imagebank of hand-written numbers <a class='underline text-primary-dark dark:text-primary-light' href='https://www.kaggle.com/scolianni/mnistasjpg'>here</a>. <br> This model learns to identify hand written numbers."
      },
      {
        id: 'overview',
        name: 'Overview',
        yup: yup.string().required(),
        as: 'textarea',
        type: 'textarea',
        default:
          'eg. : The MNIST handwritten digit classification problem is a standard dataset used in computer vision and deep learning. Although the dataset is effectively solved, we use it to test our Decentralised Learning algorithms and platform.'
      },
      {
        id: 'model',
        name: 'Model Description',
        yup: yup.string().required(),
        as: 'textarea',
        type: 'textarea',
        default:
          'eg. : The current model is a very simple CNN and its main goal is to test the app and the Decentralizsed Learning functionality.'
      },
      {
        id: 'tradeoffs',
        name: 'Tradeoffs',
        yup: yup.string().required(),
        as: 'textarea',
        type: 'textarea',
        default:
          'eg. : We are using a simple model, first a 2d convolutional layer > max pooling > 2d convolutional layer > max pooling > convolutional layer > 2 dense layers.'
      },
      {
        id: 'dataFormatInformation',
        name: 'Data Format Information',
        yup: yup.string().required(),
        as: 'textarea',
        type: 'textarea',
        default:
          'eg. : This model is trained on images corresponding to digits 0 to 9. You can upload each digit image of your dataset in the box corresponding to its label. The model taskes images of size 28x28 as input.'
      },
      {
        id: 'dataExampleText',
        name: 'Data Example Text',
        yup: yup.string().required(),
        as: 'input',
        type: 'text',
        default:
          'eg. : Below you can find an example of an expected image representing the digit 9.'
      }
    ],
    tabular: [
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
            default: 'eg. : PassengerID'
          },
          {
            key: 'columnData',
            default: 'eg. : 1'
          }
        ]
      },
      {
        id: 'headers',
        name: 'Headers',
        yup: yup.array().of(yup.string().required()),
        as: 'input',
        type: 'array',
        default: 'eg. : PassengerID'
      }
    ],
    image: [
      {
        id: 'dataExampleImage',
        name: 'Data Example Image',
        yup: yup.string().required(),
        as: 'input',
        type: 'text',
        default: 'eg. : ./9-mnist-example.png'
      }
    ],
    other: []
  },
  // *** Section ***
  {
    title: 'Training Information',
    id: 'trainingInformation',
    fields: [
      {
        id: 'modelID',
        name: 'Model IDentifier',
        yup: yup.string().required(),
        as: 'input',
        type: 'text',
        default: 'eg. : mnist-model'
      },
      {
        id: 'port',
        name: 'Port',
        yup: yup.number().integer().positive().required(),
        as: 'input',
        type: 'number',
        default: 'eg. : 9001'
      },
      {
        id: 'epoch',
        name: 'Epoch',
        yup: yup.number().integer().positive().required(),
        as: 'input',
        type: 'number',
        default: 'eg. : 10'
      },
      {
        id: 'validationSplit',
        name: 'Validation split',
        yup: yup.number().positive().lessThan(1).required(),
        as: 'textarea',
        type: 'number',
        default: 'eg. : 0.2'
      },
      {
        id: 'batchSize',
        name: 'Batch size',
        yup: yup.number().integer().positive().required(),
        as: 'input',
        type: 'number',
        default: 'eg. : 30'
      },
      {
        id: 'learningRate',
        name: 'Learning rate',
        yup: yup.number().positive().required(),
        as: 'textarea',
        type: 'number',
        default: 'eg. : 0.05'
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
            default: 'eg. : epochs'
          },
          {
            key: 'value',
            default: 'eg. : 10'
          }
        ]
      }
    ],
    tabular: [
      {
        id: 'receivedMessagesThreshold',
        name: 'Received Messages Threshold',
        yup: yup.number().required(),
        as: 'input',
        type: 'number',
        default: 'eg. : 1'
      },
      {
        id: 'outputColumn',
        name: 'Output Column',
        yup: yup.string().required(),
        as: 'input',
        type: 'text',
        default: 'eg. : Survived'
      },
      {
        id: 'inputColumn',
        name: 'Input Column',
        yup: yup.array().of(yup.string()).min(1).required(),
        as: 'input',
        type: 'array',
        default: 'eg. : PassengerID'
      }
    ],
    image: [
      {
        id: 'threshold',
        name: 'Threshold',
        yup: yup.number().integer().positive().required(),
        as: 'input',
        type: 'number',
        default: 'eg. : 1'
      },
      {
        id: 'IMAGE_H',
        name: 'Height of Image (pixels)',
        yup: yup.number().integer().positive().required(),
        as: 'input',
        type: 'number',
        default: 'eg. : 28'
      },
      {
        id: 'IMAGE_W',
        name: 'Width of Image (pixels)',
        yup: yup.number().integer().positive().required(),
        as: 'input',
        type: 'number',
        default: 'eg. : 28'
      },
      {
        id: 'LABEL_LIST',
        name: 'List of labels',
        yup: yup.array().of(yup.string()).min(1).required(),
        as: 'input',
        type: 'array',
        default: 'eg. : 0'
      },
      {
        id: 'NUM_CLASSES',
        name: 'Number of classes',
        yup: yup.number().positive().required(),
        as: 'input',
        type: 'number',
        default: 'eg. : 2'
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
            default: 'eg. : airplane'
          },
          {
            key: 'intLabel',
            default: 'eg. : 1'
          }
        ]
      },
      {
        id: 'csvLabels',
        name: 'Are labels stored as CSV ?',
        yup: yup.boolean().required(),
        as: 'input',
        type: 'checkbox',
        default: false
      },
      {
        id: 'aggregateImagesByID',
        name: 'Aggregate Images By ID',
        yup: yup.boolean(),
        as: 'input',
        type: 'checkbox',
        default: false
      }
    ],
    other: []
  },
  // *** Section ***
  {
    title: 'Model Compile Data',
    id: 'modelCompileData',
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
        default: 'eg. : rmsprop'
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
        default: 'eg. : categoricalCrossentropy'
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
    ],
    tabular: [],
    image: [],
    other: []
  },
  {
    title: 'Model Files',
    id: 'modelFiles',
    fields: [
      {
        id: 'modelFile',
        name: 'TensorFlow.js Model in JSON format',
        yup: yup
          .object()
          .shape({
            file: yup.mixed().required('File is required')
          })
          .required('File is required'),
        type: 'file',
        extension: '.json',
        default: 'eg. : model.json'
      },
      {
        id: 'weightsFile',
        name: 'TensorFlow.js Model Weights in .bin format',
        yup: yup
          .object()
          .shape({
            file: yup.mixed().required('File is required')
          })
          .required('File is required'),
        type: 'file',
        extension: '.bin',
        default: 'eg. : weights.bin'
      }
    ],
    tabular: [],
    image: [],
    other: []
  }
]
