import { Migration } from '@mikro-orm/migrations';
export class Migration20260906020000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "elector_identity_verifications" add column "user_principal_id" varchar(255) null, add column "is_mock" boolean not null default false;',
    );
    this.addSql(
      `create index "elector_verification_principal_index" on "elector_identity_verifications" ("elector_id", "user_principal_id") where "status" = 'SUCCESS';`,
    );
  }
  override down(): void {
    this.addSql('drop index "elector_verification_principal_index";');
    this.addSql(
      'alter table "elector_identity_verifications" drop column "is_mock", drop column "user_principal_id";',
    );
  }
}
