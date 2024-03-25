export interface LabelType {
  labelType: LabelTypeEnum
  mapBaseUrl?: string
}

export enum LabelTypeEnum {
  TEXT, POLYGON_MAP
}

function isLabelTypeEnum(raw: unknown): raw is LabelTypeEnum {
  switch (raw) {
    case LabelTypeEnum.TEXT: break
    case LabelTypeEnum.POLYGON_MAP: break
    default: return false
  }

  const _: LabelTypeEnum = raw

  return true
}

export function isLabelType(raw: unknown): raw is LabelType {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const { labelType, mapBaseUrl }: Partial<Record<keyof LabelType, unknown>> = raw

  if (
    !isLabelTypeEnum(labelType) ||
    (mapBaseUrl !== undefined && typeof mapBaseUrl !== 'string')
  ) {
    return false
  }

  const repack = { labelType, mapBaseUrl }
  const _correct: LabelType = repack
  const _total: Record<keyof LabelType, unknown> = repack

  return true
}
