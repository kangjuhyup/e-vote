import { Migration } from '@mikro-orm/migrations';

export class Migration20260813010000 extends Migration {
  override up(): void {
    this.addSql('alter table "electors" alter column "name" type text;');
    this.addSql('alter table "electors" add column "phone_number" text null;');
    this.addSql(
      'alter table "electors" add column "phone_number_hash" varchar(255) null;',
    );
    this.addSql('alter table "electors" add column "birth_date" text null;');
    this.addSql(
      'create index "electors_vote_id_phone_number_hash_index" on "electors" ("vote_id", "phone_number_hash") where "phone_number_hash" is not null;',
    );
  }

  override down(): void {
    this.addSql(
      'drop index if exists "electors_vote_id_phone_number_hash_index";',
    );
    this.addSql('alter table "electors" drop column if exists "birth_date";');
    this.addSql(
      'alter table "electors" drop column if exists "phone_number_hash";',
    );
    this.addSql('alter table "electors" drop column if exists "phone_number";');
    this.addSql(
      'alter table "electors" alter column "name" type varchar(255);',
    );
  }
}
