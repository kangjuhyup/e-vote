import { Migration } from '@mikro-orm/migrations';

export class Migration20260909020000 extends Migration {
  override up(): void {
    this.addSql(`create table "user_profiles" (
      "id" uuid primary key,
      "tenant_code" varchar(64) not null,
      "user_principal_id" varchar(255) not null,
      "name" varchar(64) not null,
      "email" varchar(254) not null,
      "phone" varchar(32) not null,
      "created_at" timestamptz not null,
      "updated_at" timestamptz not null
    );`);
    this.addSql(
      'create unique index "user_profiles_tenant_principal_unique" on "user_profiles" ("tenant_code", "user_principal_id");',
    );
  }
  override down(): void {
    this.addSql('drop table if exists "user_profiles" cascade;');
  }
}
