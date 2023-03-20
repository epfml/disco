import { MikroORM } from '@mikro-orm/postgresql'
import { config } from './database/mikro-orm.config.js'
import type { PostgreSqlDriver } from '@mikro-orm/postgresql'

export let orm: MikroORM

export async function initORM (): Promise<void> {
  orm = await MikroORM.init<PostgreSqlDriver>(config)
  const migrator = orm.getMigrator()
  console.info('Running database migrations...')
  await migrator.up()
  console.info('database migrations successful!')
}
