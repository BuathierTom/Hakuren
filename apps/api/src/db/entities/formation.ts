import { EntitySchema } from '@mikro-orm/core';

export class Formation {
  id!: number;
  code!: string;
  name!: string;
}

export const FormationSchema = new EntitySchema({
  class: Formation,
  tableName: 'formations',
  properties: {
    id: { primary: true, type: 'integer' },
    code: { type: 'string', length: 32, collation: 'ascii_bin', unique: 'code' },
    name: { type: 'string', length: 120 },
  },
});
