import { Type } from 'class-transformer'
import { IsArray, IsEnum, IsNotEmpty, ValidateNested } from 'class-validator'
export enum DatasetType {
  Tabular = 'TABULAR',
  Image = 'IMAGE'
}

export enum SourceType {
  LocalPath = 'LOCAL_PATH',
  DirectUrl = 'DIRECT_URL',
  GoogleDrive = 'GOOGLE_DRIVE'
}

export class InputDataset {
  @IsEnum(DatasetType)
  dataType: DatasetType

  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => InputFeature)
  features: InputFeature[]

  @IsNotEmpty()
  title: string

  description?: string

  @IsNotEmpty()
  source: string

  @IsEnum(SourceType)
  sourceType: SourceType

  constructor (
    dataType: DatasetType,
    features: InputFeature[],
    title: string,
    description: string,
    source: string,
    sourceType: SourceType
  ) {
    this.dataType = dataType
    this.features = features
    this.title = title
    this.description = description
    this.source = source
    this.sourceType = sourceType
  }
}

export class InputFeature {
  @IsNotEmpty()
  name: string

  description?: string

  allowFeature: boolean

  allowLabel: boolean

  constructor (
    name: string,
    description: string,
    allowFeature: boolean,
    allowLabel: boolean
  ) {
    this.name = name
    this.description = description
    this.allowFeature = allowFeature
    this.allowLabel = allowLabel
  }
}
