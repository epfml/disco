import { Entity, Property, PrimaryKey, ManyToOne } from '@mikro-orm/core'
import { v4 } from 'uuid'
import { type Dataset } from './index.js'

@Entity()
export class Feature {
  @PrimaryKey()
  id: string = v4()

  @ManyToOne('Dataset')
  dataset!: Dataset

  @Property()
  name: string

  @Property({ nullable: true })
  description?: string

  @Property()
  allowFeature: boolean

  @Property()
  allowLabel: boolean

  @Property()
  columnNumber: number

  @Property({ nullable: true })
  dateCreated?: Date

  @Property({ nullable: true, onUpdate: () => new Date() })
  dateUpdated?: Date

  constructor (
    name: string,
    description: string | undefined,
    allowFeature: boolean,
    allowLabel: boolean,
    columnNumber: number
  ) {
    this.name = name
    this.description = description
    this.allowFeature = allowFeature
    this.allowLabel = allowLabel
    this.columnNumber = columnNumber
  }
}
