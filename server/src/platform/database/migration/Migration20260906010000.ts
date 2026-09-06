import { Migration } from '@mikro-orm/migrations';
export class Migration20260906010000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "electoral_rolls" add column "deleted_at" timestamptz null;',
    );
    this.addSql(
      'alter table "election_commissions" add column "deleted_at" timestamptz null;',
    );
  }
  override down(): void {
    this.addSql('alter table "election_commissions" drop column "deleted_at";');
    this.addSql('alter table "electoral_rolls" drop column "deleted_at";');
  }
}
