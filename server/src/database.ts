import { MikroORM } from '@mikro-orm/postgresql'
import type { PostgreSqlDriver } from '@mikro-orm/postgresql'

export let orm: MikroORM

export async function initORM (): Promise<void> {
  orm = await MikroORM.init<PostgreSqlDriver>()
  const migrator = orm.getMigrator()
  console.info('Running database migrations...')
  await migrator.up()
  console.info('database migrations successful!')
}
