import { EntitySchema, type Opt } from '@mikro-orm/core';

export class Rarity {
  id!: number;
  code!: string;
  name!: string;
  sortOrder: number & Opt = 0;
}

export const RaritySchema = new EntitySchema({
  class: Rarity,
  tableName: 'rarities',
  properties: {
    id: { primary: true, type: 'integer' },
    code: { type: 'string', length: 32, collation: 'ascii_bin', unique: 'code' },
    name: { type: 'string', length: 64 },
    sortOrder: { type: 'smallint', unsigned: true },
  },
});
