import type { Dataset } from '..'

import { TabularLoader } from './tabular_loader'

/**
 * Text data loader whose instantiable implementation is delegated by the platform-dependent Disco subprojects, namely,
 * @epfml/discojs-web and @epfml/discojs-node. Loads data from files whose entries are line-separated and each consist of
 * a sentence-like sample associated to an optional label.
 */
export abstract class TextLoader<Source> extends TabularLoader<Source> {
  abstract loadDatasetFrom (source: Source, config: Record<string, unknown>): Promise<Dataset>
}
