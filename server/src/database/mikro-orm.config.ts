import { type Options, ReflectMetadataProvider } from '@mikro-orm/core'
import type { PostgreSqlDriver } from '@mikro-orm/postgresql'
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import

// Use development secrets when not in production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.dev' })
}

export const config: Options<PostgreSqlDriver> = {
  metadataProvider: ReflectMetadataProvider,
  entities: ['./dist/database/entities'], // path to our JS entities (dist), relative to `baseDir`
  entitiesTs: ['./src/database/entities'], // path to our TS entities (src), relative to `baseDir`
  dbName: 'disco',
  type: 'postgresql',
  host: process.env.DB_URL ?? '127.0.0.1',
  user: 'disco',
  password: process.env.DB_PASSWORD,
  migrations: {
    path: './src/database/migrations', // path to the folder with migrations,
    snapshot: false
  },
  validate: false
}

export default config
