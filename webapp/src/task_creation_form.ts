import * as yup from 'yup'

interface FormElement {
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
      options: ['Image (.png, .jpg)', 'Tabular (.csv)', 'Text (.txt)'],
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
  title: 'Task & Model Description',
  fields: [
    {
      id: 'taskTitle',
      name: 'Task Title',
      yup: yup.string().required(),
      as: 'input',
      type: 'text',
      default: 'MNIST'
    },
    {
      id: 'preview',
      name: 'Task Preview',
      yup: yup.string(),
      as: 'textarea',
      type: 'text',
      default:
        "Test our platform by using a publicly available <b>image</b> dataset. <br><br> Download the classic MNIST imagebank of hand-written numbers <a class='underline text-blue-400' target='_blank' href='https://www.kaggle.com/scolianni/mnistasjpg'>here</a>. <br> This model learns to identify hand written numbers."
    },
    {
      id: 'overview',
      name: 'Task Overview',
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
      name: 'Data Example Description',
      description: 'Data Example: Description',
      yup: yup.string(),
      as: 'input',
      type: 'text',
      default:
        'Below you can find an example of an expected image representing the digit 9.'
    },
    {
      id: 'dataExample',
      name: 'Data Example',
      description: 'Data Example: CSV header and row',
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
      description: 'Data Example: Image (.jpg, .png)',
      yup: yup.string(),
      as: 'input',
      type: 'text',
      default: 'https://example.com/your/example/image.jpg',
      dependencies: {
        dataType: 'image'
      }
    }
  ]
}

export const trainingInformation: FormSection = {
  id: 'trainingInformation',
  title: 'Training Parameters',
  fields: [
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
      name: 'Validation Split',
      yup: yup.number().positive().lessThan(1).required(),
      as: 'input',
      type: 'float',
      default: '0.2'
    },
    {
      id: 'batchSize',
      name: 'Batch Size',
      yup: yup.number().integer().positive().required(),
      as: 'input',
      type: 'number',
      default: '30'
    },
    {
      id: 'minNbOfParticipants',
      name: 'Minimum # of Peers',
      description: 'Minimum # of Ready Peers before Aggregation',
      yup: yup
        .number()
        .integer()
        .positive(),
      as: 'input',
      type: 'number',
      default: '3'
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
          key: 'Training Parameter',
          default: 'epochs'
        },
        {
          key: 'value',
          default: '10'
        }
      ]
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
      id: 'inputColumns',
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
    }
  ]
}

export const privacyParameters: FormSection = {
  id: 'privacyParameters',
  title: 'Privacy Parameters',
  fields: [
    {
      id: 'noiseScale',
      name: 'Noise Scale',
      description: 'Differential Privacy: Noise Scale',
      yup: yup.number().positive(),
      as: 'input',
      type: 'number',
      default: '0.1'
    },
    {
      id: 'clippingRadius',
      name: 'Clipping Radius',
      description: 'Differential Privacy: Clipping Radius',
      yup: yup.number().positive(),
      as: 'input',
      type: 'number',
      default: '40.0'
    },
    {
      id: 'maxShareValue',
      name: 'Maximum Share Value',
      description: 'Maximum Value of Shares used in Secure Aggregation',
      yup: yup.number().integer().positive(),
      as: 'input',
      type: 'number',
      default: '100',
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
      description: 'URL endpoint serving the initial model files. See <a class="text-disco-cyan hover:text-disco-blue" target="_blank" href="https://www.tensorflow.org/js/guide/save_load#https">Tensorflow.js docs</a> for more information.',
      type: 'text',
      yup: yup
        .string()
        .when(['modelFile', 'weightsFile'], otherReq((v: string) => !v)),
      default: 'https://example.com/model.json'
    },
    {
      id: 'modelFile',
      name: 'Model File',
      description: 'Alternatively: Tensorflow.js Model in JSON format',
      type: 'file',
      yup: yup.string().when('modelURL', otherReq((v: string) => !v)),
      extension: '.json',
      default: 'model.json'
    },
    {
      id: 'weightsFile',
      name: 'Weights File',
      description: 'Alternatively: Initial Tensorflow.js Model Weights in .bin format',
      type: 'file',
      yup: yup.string().when('modelURL', otherReq((v: string) => !v)),
      extension: '.bin',
      default: 'weights.bin'
    }
  ]
}

export const sections: FormSection[] = [
  generalInformation,
  displayInformation,
  trainingInformation,
  privacyParameters,
  modelFiles
]
