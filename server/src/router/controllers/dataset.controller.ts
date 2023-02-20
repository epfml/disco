import { type Dataset } from '../../database/entities/dataset.js'
import { Router, type Request, type Response } from 'express'
import asyncHandler from 'express-async-handler'
import { validate, validateOrReject, type ValidationError } from 'class-validator'
import * as datasetService from '../../service/dataset.service.js'
import { InputDataset, type SourceType } from '../../dto/InputDataset.js'
import { plainToInstance } from 'class-transformer'
import { type DatasetSample } from '../../dto/DatasetSample.js'

/* Controller handles:
  - Security
  - Input Validation
  - Response formatting
*/

const router = Router()

class ValidationException extends Error {
  errors: ValidationError[]

  constructor (errors: ValidationError[]) {
    super(errors.toString())

    this.errors = errors
  }
}

async function validationCheck<T extends object> (object: T): Promise<void> {
  const errors: ValidationError[] = await validate(object, { validationError: { target: false } })
  if (errors.length !== 0) {
    throw new ValidationException(errors)
  }
}

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const dataset: Dataset[] = await datasetService.findAll()

  res.json(dataset)
}))

router.get('/features', asyncHandler(async (req: Request, res: Response) => {
  const features: string[] = await datasetService.loadFeatures(req.query.source as string, req.query.sourceType as string as SourceType)

  res.json(features)
}))

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dataset: Dataset = await datasetService.find(req.params.id)

  res.json(dataset)
}))

router.get('/:id/sample', asyncHandler(async (req: Request, res: Response) => {
  const sample: DatasetSample = await datasetService.loadSample(req.params.id)

  res.json(sample)
}))

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const datasetDto: InputDataset = plainToInstance(InputDataset, req.body as object)
    // await validationCheck<InputDataset>(datasetDto)
    await validateOrReject(datasetDto, { validationError: { target: false } }).catch(err => {
      throw new ValidationException(err)
    })
    const dataset = await datasetService.insert(datasetDto)

    res.json(dataset)
  } catch (e: any) {
    if (e instanceof ValidationException) {
      res.status(400).json(e.errors)
    } else { throw e }
  }
}))

router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  // TODO: Don't forget security (auth), not everybody should be able to update anything
  try {
    const datasetDto = req.body as InputDataset
    await validationCheck(datasetDto)

    const updated = await datasetService.update(req.params.id, datasetDto)

    res.json(updated)
  } catch (e: any) {
    if (e instanceof ValidationException) {
      res.status(400).json(e.errors)
    } else { throw e }
  }
}))

export const DatasetController = router
