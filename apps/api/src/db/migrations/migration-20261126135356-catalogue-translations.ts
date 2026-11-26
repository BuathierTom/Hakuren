import { readFile } from 'node:fs/promises';
import {
  backfillCatalogueTranslations,
  type CatalogueTextSeed,
} from '../../catalogue/translation-backfill.js';
import { Migration } from '@mikro-orm/migrations';

export class Migration20261126135356_catalogue_translations extends Migration {
  override name = 'Migration20261126135356_catalogue_translations';

  override async up(): Promise<void> {
    for (const table of [
      'player_variants',
      'techniques',
      'catalogue_items',
      'catalogue_passives',
    ]) {
      const columns = await this.execute(
        'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
        [table, 'translations'],
      );
      if (!columns.length)
        await this.execute(`ALTER TABLE ${table} ADD translations JSON NULL DEFAULT NULL`);
    }
    const seed = JSON.parse(
      await readFile(new URL('../../../database/catalogue-texts.json', import.meta.url), 'utf8'),
    ) as CatalogueTextSeed;
    await backfillCatalogueTranslations((sql, values) => this.execute(sql, values), seed);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table \`catalogue_items\` drop column \`translations\`;`);

    this.addSql(`alter table \`catalogue_passives\` drop column \`translations\`;`);

    this.addSql(`alter table \`player_variants\` drop column \`translations\`;`);

    this.addSql(`alter table \`techniques\` drop column \`translations\`;`);
  }
}
