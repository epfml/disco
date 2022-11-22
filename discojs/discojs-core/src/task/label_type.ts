export interface LabelType {
  labelType: LabelTypeEnum
  mapBaseUrl?: string
}

export enum LabelTypeEnum {
  TEXT, POLYGON_MAP
}
