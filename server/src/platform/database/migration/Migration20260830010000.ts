import { Migration } from '@mikro-orm/migrations';

export class Migration20260830010000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "election_commission_members" add column "user_principal_id" varchar(255) null;',
    );
    this.addSql(
      'create unique index "election_commission_members_commission_user_unique" on "election_commission_members" ("commission_id", "user_principal_id");',
    );
    this.addSql(
      'create index "election_commission_members_user_principal_status_index" on "election_commission_members" ("user_principal_id", "status");',
    );
  }

  override down(): void {
    this.addSql(
      'drop index if exists "election_commission_members_user_principal_status_index";',
    );
    this.addSql(
      'drop index if exists "election_commission_members_commission_user_unique";',
    );
    this.addSql(
      'alter table "election_commission_members" drop column if exists "user_principal_id";',
    );
  }
}
