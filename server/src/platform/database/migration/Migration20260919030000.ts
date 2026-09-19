import { Migration } from '@mikro-orm/migrations';

export class Migration20260919030000 extends Migration {
  override up(): void {
    this.addSql(`
      create table "vote_content_change_files" (
        "id" uuid primary key,
        "vote_id" uuid not null references "votes" ("id") on delete cascade,
        "owner_user_principal_id" varchar(255) not null,
        "kind" varchar(32) not null check ("kind" in ('DOCUMENT', 'VOTE_ATTACHMENT', 'CANDIDATE_ATTACHMENT')),
        "candidate_id" uuid null references "candidates" ("id") on delete restrict,
        "attachment_type" varchar(32) null,
        "sort_order" integer null,
        "storage_key" varchar(255) not null unique,
        "original_name" varchar(255) not null,
        "mime_type" varchar(255) not null,
        "size_bytes" integer not null check ("size_bytes" > 0 and "size_bytes" <= 20971520),
        "checksum" varchar(255) null,
        "confirmed_at" timestamptz null,
        "request_id" uuid null,
        "created_at" timestamptz not null default now(),
        constraint "vote_content_change_files_kind_target_check" check (
          ("kind" = 'CANDIDATE_ATTACHMENT' and "candidate_id" is not null)
          or ("kind" <> 'CANDIDATE_ATTACHMENT' and "candidate_id" is null)
        )
      );
    `);
    this.addSql(`
      create table "vote_content_change_requests" (
        "id" uuid primary key,
        "vote_id" uuid not null references "votes" ("id") on delete cascade,
        "tenant_id" varchar(255) not null,
        "submitted_by_user_principal_id" varchar(255) not null,
        "status" varchar(24) not null check ("status" in ('PENDING', 'APPROVED', 'REJECTED', 'INVALIDATED')),
        "reason" text not null,
        "document_file_id" uuid not null references "vote_content_change_files" ("id") on delete restrict,
        "proposal" jsonb not null,
        "snapshot" jsonb not null,
        "submitted_at" timestamptz not null,
        "reviewed_by_user_principal_id" varchar(255) null,
        "reviewed_at" timestamptz null,
        "review_reason" text null
      );
    `);
    this.addSql(
      'create unique index "vote_content_change_one_pending_per_vote" on "vote_content_change_requests" ("vote_id") where "status" = \'PENDING\';',
    );
    this.addSql(
      'create index "vote_content_change_requests_tenant_status_idx" on "vote_content_change_requests" ("tenant_id", "status", "submitted_at" desc);',
    );
    this.addSql(
      'alter table "vote_content_change_files" add constraint "vote_content_change_files_request_id_foreign" foreign key ("request_id") references "vote_content_change_requests" ("id") on delete restrict;',
    );
    this.addSql(
      'alter table "vote_content_change_histories" add column "change_request_id" uuid null references "vote_content_change_requests" ("id") on delete set null;',
    );
    this.addSql(
      'alter table "vote_content_change_histories" alter column "change_reason" type text;',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "vote_content_change_histories" drop column if exists "change_request_id";',
    );
    this.addSql('drop table if exists "vote_content_change_requests" cascade;');
    this.addSql('drop table if exists "vote_content_change_files" cascade;');
  }
}
