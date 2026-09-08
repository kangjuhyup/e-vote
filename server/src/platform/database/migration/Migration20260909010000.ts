import { Migration } from '@mikro-orm/migrations';

export class Migration20260909010000 extends Migration {
  override up(): void {
    this.addSql('alter table "votes" add column "tenant_id" varchar(255) null;');
    this.addSql(
      'alter table "votes" add column "organization_group_id" varchar(255) null;',
    );
    this.addSql(
      'alter table "votes" add column "organization_group_code" varchar(50) null;',
    );
    this.addSql(
      'create index "votes_tenant_organization_created_at" on "votes" ("tenant_id", "organization_group_id", "created_at" desc);',
    );
    this.addSql(`alter table "votes" add constraint "votes_organization_ownership_complete" check (
      ("tenant_id" is null and "organization_group_id" is null and "organization_group_code" is null)
      or
      ("tenant_id" is not null and "organization_group_id" is not null and "organization_group_code" is not null)
    );`);
  }

  override down(): void {
    this.addSql('drop index if exists "votes_tenant_organization_created_at";');
    this.addSql(
      'alter table "votes" drop constraint if exists "votes_organization_ownership_complete";',
    );
    this.addSql('alter table "votes" drop column "organization_group_code";');
    this.addSql('alter table "votes" drop column "organization_group_id";');
    this.addSql('alter table "votes" drop column "tenant_id";');
  }
}
