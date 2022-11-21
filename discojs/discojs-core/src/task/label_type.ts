export interface LabelType {
  labelType: LabelTypeEnum
  gpsData?: {
    apiKey: string
    mappingUrl: string
  }
}

export enum LabelTypeEnum {
  TEXT, GPS
}

export async function getGpsMappingObject (url: string): Promise<{ [key: string]: string} > {
  const fetchedFile = await fetch(url)
  const jsonFile: { [key: string]: string} = await fetchedFile.json()

  return jsonFile
}

export function getMapUrl (key: string, polygonPath: string): string {
  return 'https://maps.googleapis.com/maps/api/staticmap?size=2500x2500&key=' + key + '&path=color:0x274C78|weight:2|fillcolor:0x6096BA|' + polygonPath
}
