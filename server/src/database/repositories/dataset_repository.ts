import { EntityRepository } from '@mikro-orm/postgresql'
import type { Dataset } from '../entities/dataset.js'

export class DatasetRepository extends EntityRepository<Dataset> {

}
