import { DatasetType, SourceType } from '../../dto/InputDataset.js'
import { Entity, Property, PrimaryKey, OneToMany, Collection } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { DatasetRepository } from '../repositories/dataset_repository.js'
import { Feature } from './index.js'

@Entity({ customRepository: () => DatasetRepository })
export class Dataset {
  @PrimaryKey()
  id: string = v4()

  @Property()
  dataType: DatasetType

  @OneToMany(() => Feature, feature => feature.dataset)
  features = new Collection<Feature>(this)

  @Property()
  title: string

  @Property()
  description?: string

  @Property()
  dataCount: number

  @Property()
  columnCount: number

  @Property()
  source: string

  @Property()
  sourceType: SourceType

  @Property({ nullable: true })
  dateCreated?: Date

  @Property({ nullable: true, onUpdate: () => new Date() })
  dateUpdated?: Date

  constructor (
    dataType: DatasetType,
    title: string,
    description: string | undefined,
    dataCount: number,
    columnCount: number,
    source: string,
    sourceType: SourceType
  ) {
    this.dataType = dataType
    this.title = title
    this.description = description
    this.dataCount = dataCount
    this.columnCount = columnCount
    this.source = source
    this.sourceType = sourceType
  }
}
