import { Migration } from '@mikro-orm/migrations';

export class Migration20260909030000 extends Migration {
  override up(): void {
    this.addSql(`create table "organization_invitations" (
      "id" uuid primary key,
      "tenant_id" varchar(255) not null,
      "tenant_code" varchar(255) not null,
      "organization_group_id" varchar(255) not null,
      "organization_group_code" varchar(255) not null,
      "organization_name" varchar(255) not null,
      "manager_group_id" varchar(255) not null,
      "manager_group_code" varchar(255) not null,
      "contact_type" varchar(16) not null,
      "contact_hash" varchar(64) not null,
      "contact_hint" varchar(254) not null,
      "token_hash" varchar(64) not null,
      "role" varchar(16) not null,
      "status" varchar(16) not null,
      "invited_by_user_principal_id" varchar(255) not null,
      "invited_at" timestamptz not null,
      "expires_at" timestamptz not null,
      "accepted_by_user_principal_id" varchar(255) null,
      "accepted_at" timestamptz null,
      "updated_at" timestamptz not null,
      constraint "organization_invitations_role_check" check ("role" in ('MEMBER', 'MANAGER')),
      constraint "organization_invitations_status_check" check ("status" in ('PENDING', 'ACCEPTED', 'REVOKED')),
      constraint "organization_invitations_contact_type_check" check ("contact_type" in ('EMAIL', 'PHONE'))
    );`);
    this.addSql(
      'create unique index "organization_invitations_token_hash_unique" on "organization_invitations" ("token_hash");',
    );
    this.addSql(
      'create index "organization_invitations_organization_invited_at" on "organization_invitations" ("tenant_id", "organization_group_id", "invited_at" desc);',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "organization_invitations" cascade;');
  }
}
