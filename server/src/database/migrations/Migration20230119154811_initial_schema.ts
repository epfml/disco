import { Migration } from '@mikro-orm/migrations'

export class Migration20230119154811 extends Migration {
  async up (): Promise<void> {
    const knexQuery = this.getKnex().schema
      .createTable('dataset', table => {
        table.uuid('id', { primaryKey: true }).primary().notNullable()
        table.string('data_type').notNullable()
        table.string('title').notNullable()
        table.string('description').nullable()
        table.bigInteger('data_count').notNullable()
        table.integer('column_count').notNullable()
        table.string('source').notNullable()
        table.string('source_type').notNullable()
        table.datetime('date_created').notNullable().defaultTo(this.getKnex().fn.now())
        table.datetime('date_updated').notNullable().defaultTo(this.getKnex().fn.now())
      })
      .createTable('feature', table => {
        table.uuid('id', { primaryKey: true }).primary().notNullable()
        table.uuid('dataset_id').notNullable()
        table.foreign('dataset_id').references('dataset.id').onDelete('CASCADE')
        table.string('name').notNullable()
        table.text('description').nullable()
        table.boolean('allow_feature').notNullable()
        table.boolean('allow_label').notNullable()
        table.integer('column_number').notNullable()
        table.datetime('date_created').notNullable().defaultTo(this.getKnex().fn.now())
        table.datetime('date_updated').notNullable().defaultTo(this.getKnex().fn.now())
      })
      .toQuery()

    await this.execute(knexQuery)
  }
}
