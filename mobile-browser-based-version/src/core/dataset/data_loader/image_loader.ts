import { DataLoader } from './data_loader'

export class ImageLoader extends DataLoader {
  read (sources: Array<string>) { return 1 as any }
}
