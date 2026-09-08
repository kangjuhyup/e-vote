import { Migration } from '@mikro-orm/migrations';

export class Migration20260909000000 extends Migration {
  override up(): void {
    this.addSql(`create table "organization_applications" (
      "id" uuid primary key,
      "tenant_id" varchar(255) not null,
      "tenant_code" varchar(255) not null,
      "applicant_user_principal_id" varchar(255) not null,
      "organization_name" varchar(128) not null,
      "organization_management_number" varchar(50) not null,
      "organization_type" varchar(32) not null,
      "contact_name" varchar(64) not null,
      "contact_phone" varchar(32) null,
      "status" varchar(32) not null,
      "submitted_at" timestamptz not null,
      "reviewer_user_principal_id" varchar(255) null,
      "reviewed_at" timestamptz null,
      "rejection_reason" text null,
      "auth_organization_group_id" varchar(255) null,
      "auth_organization_group_code" varchar(64) null,
      "auth_manager_group_id" varchar(255) null,
      "auth_manager_group_code" varchar(64) null,
      "auth_manager_parent_group_id" varchar(255) null,
      "provisioning_error" text null,
      "updated_at" timestamptz not null,
      constraint "organization_applications_status_check" check ("status" in ('PENDING','PROVISIONING','APPROVED','REJECTED','PROVISIONING_FAILED')),
      constraint "organization_applications_type_check" check ("organization_type" in ('APARTMENT','ASSOCIATION','COMPANY','OTHER'))
    );`);
    this.addSql(
      'create unique index "organization_applications_tenant_management_number_unique" on "organization_applications" ("tenant_id", "organization_management_number");',
    );
    this.addSql(
      `create unique index "organization_applications_one_active_per_applicant" on "organization_applications" ("tenant_id", "applicant_user_principal_id") where "status" in ('PENDING','PROVISIONING','APPROVED','PROVISIONING_FAILED');`,
    );
    this.addSql(
      'create index "organization_applications_admin_page" on "organization_applications" ("tenant_id", "status", "submitted_at" desc);',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "organization_applications" cascade;');
  }
}
