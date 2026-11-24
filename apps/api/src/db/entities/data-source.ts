import { EntitySchema } from '@mikro-orm/core';

export class DataSource {
  id!: number;
  code!: string;
  name!: string;
  url?: string | null = null;
}

export const DataSourceSchema = new EntitySchema({
  class: DataSource,
  tableName: 'data_sources',
  properties: {
    id: { primary: true, type: 'integer' },
    code: { type: 'string', length: 64, collation: 'ascii_bin', unique: 'code' },
    name: { type: 'string', length: 120 },
    url: { type: 'string', length: 1024, nullable: true },
  },
});
