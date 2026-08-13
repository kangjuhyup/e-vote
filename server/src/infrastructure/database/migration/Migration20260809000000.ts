import { Migration } from '@mikro-orm/migrations';

export class Migration20260809000000 extends Migration {
  override up(): void {
    this.addSql(`
      create table "votes" (
        "id" uuid not null,
        "title" varchar(255) not null,
        "description" text not null,
        "default_privacy_mode" varchar(255) not null,
        "default_participation_unit" varchar(255) not null,
        "default_result_storage_mode" varchar(255) not null,
        "default_vote_weight_mode" varchar(255) not null,
        "identity_verification_required" boolean not null,
        "identity_verification_provider" varchar(255) null,
        "identity_verification_method" varchar(255) null,
        "status" varchar(255) not null,
        "started_at" timestamptz not null,
        "ended_at" timestamptz not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "votes_pkey" primary key ("id"),
        constraint "votes_default_privacy_mode_check" check ("default_privacy_mode" in ('SECRET', 'PUBLIC')),
        constraint "votes_default_participation_unit_check" check ("default_participation_unit" in ('INDIVIDUAL', 'GROUP')),
        constraint "votes_default_result_storage_mode_check" check ("default_result_storage_mode" in ('DATABASE', 'BLOCKCHAIN')),
        constraint "votes_default_vote_weight_mode_check" check ("default_vote_weight_mode" in ('EQUAL', 'SHARE')),
        constraint "votes_identity_verification_provider_check" check ("identity_verification_provider" is null or "identity_verification_provider" in ('PASS', 'KAKAO_CERT', 'NAVER_CERT', 'TOSS_CERT', 'SMS', 'ETC')),
        constraint "votes_identity_verification_method_check" check ("identity_verification_method" is null or "identity_verification_method" in ('MOBILE', 'CERTIFICATE', 'SMS', 'EMAIL', 'ADMIN')),
        constraint "votes_status_check" check ("status" in ('DRAFT', 'OPEN', 'CLOSED', 'CANCELED'))
      );
    `);

    this.addSql(`
      create table "vote_details" (
        "id" uuid not null,
        "vote_id" uuid not null,
        "title" varchar(255) not null,
        "description" text not null,
        "type" varchar(255) not null,
        "privacy_mode_override" varchar(255) null,
        "participation_unit_override" varchar(255) null,
        "result_storage_mode_override" varchar(255) null,
        "vote_weight_mode_override" varchar(255) null,
        "sort_order" int not null,
        "status" varchar(255) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "vote_details_pkey" primary key ("id"),
        constraint "vote_details_type_check" check ("type" in ('CANDIDATE', 'YES_NO')),
        constraint "vote_details_privacy_mode_override_check" check ("privacy_mode_override" is null or "privacy_mode_override" in ('SECRET', 'PUBLIC')),
        constraint "vote_details_participation_unit_override_check" check ("participation_unit_override" is null or "participation_unit_override" in ('INDIVIDUAL', 'GROUP')),
        constraint "vote_details_result_storage_mode_override_check" check ("result_storage_mode_override" is null or "result_storage_mode_override" in ('DATABASE', 'BLOCKCHAIN')),
        constraint "vote_details_vote_weight_mode_override_check" check ("vote_weight_mode_override" is null or "vote_weight_mode_override" in ('EQUAL', 'SHARE')),
        constraint "vote_details_status_check" check ("status" in ('DRAFT', 'OPEN', 'CLOSED', 'CANCELED'))
      );
    `);

    this.addSql(`
      create table "electors" (
        "id" uuid not null,
        "vote_id" uuid not null,
        "name" varchar(255) not null,
        "identifier" varchar(255) not null,
        "group_key" varchar(255) null,
        "vote_weight" numeric(20, 6) not null default 1,
        "status" varchar(255) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "electors_pkey" primary key ("id"),
        constraint "electors_vote_id_identifier_unique" unique ("vote_id", "identifier"),
        constraint "electors_vote_weight_positive_check" check ("vote_weight" > 0),
        constraint "electors_status_check" check ("status" in ('ELIGIBLE', 'BLOCKED'))
      );
    `);

    this.addSql(`
      create table "candidates" (
        "id" uuid not null,
        "vote_detail_id" uuid not null,
        "candidate_no" int not null,
        "name" varchar(255) not null,
        "description" text not null,
        "status" varchar(255) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "candidates_pkey" primary key ("id"),
        constraint "candidates_vote_detail_id_candidate_no_unique" unique ("vote_detail_id", "candidate_no"),
        constraint "candidates_status_check" check ("status" in ('ACTIVE', 'WITHDRAWN'))
      );
    `);

    this.addSql(`
      create table "vote_participations" (
        "id" uuid not null,
        "vote_detail_id" uuid not null,
        "elector_id" uuid not null,
        "candidate_id" uuid null,
        "group_key" varchar(255) null,
        "vote_weight" numeric(20, 6) not null,
        "status" varchar(255) not null,
        "participated_at" timestamptz not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "vote_participations_pkey" primary key ("id"),
        constraint "vote_participations_vote_detail_id_elector_id_unique" unique ("vote_detail_id", "elector_id"),
        constraint "vote_participations_vote_weight_positive_check" check ("vote_weight" > 0),
        constraint "vote_participations_status_check" check ("status" in ('CAST', 'CANCELED'))
      );
    `);

    this.addSql(`
      create table "vote_results" (
        "id" uuid not null,
        "vote_detail_id" uuid not null,
        "candidate_id" uuid not null,
        "vote_count" int not null,
        "weighted_vote_count" numeric(20, 6) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "vote_results_pkey" primary key ("id"),
        constraint "vote_results_vote_detail_id_candidate_id_unique" unique ("vote_detail_id", "candidate_id"),
        constraint "vote_results_vote_count_non_negative_check" check ("vote_count" >= 0),
        constraint "vote_results_weighted_vote_count_non_negative_check" check ("weighted_vote_count" >= 0)
      );
    `);

    this.addSql(`
      create table "files" (
        "id" uuid not null,
        "storage_key" varchar(255) not null,
        "original_name" varchar(255) not null,
        "mime_type" varchar(255) not null,
        "size_bytes" int not null,
        "checksum" varchar(255) null,
        "status" varchar(255) not null,
        "created_at" timestamptz not null,
        "deleted_at" timestamptz null,
        constraint "files_pkey" primary key ("id"),
        constraint "files_storage_key_unique" unique ("storage_key"),
        constraint "files_size_bytes_non_negative_check" check ("size_bytes" >= 0),
        constraint "files_status_check" check ("status" in ('ACTIVE', 'DELETED'))
      );
    `);

    this.addSql(`
      create table "vote_attachments" (
        "id" uuid not null,
        "vote_id" uuid not null,
        "file_id" uuid not null,
        "type" varchar(255) not null,
        "sort_order" int not null,
        "created_at" timestamptz not null,
        constraint "vote_attachments_pkey" primary key ("id"),
        constraint "vote_attachments_vote_id_file_id_unique" unique ("vote_id", "file_id"),
        constraint "vote_attachments_type_check" check ("type" in ('NOTICE', 'GUIDE', 'ETC'))
      );
    `);

    this.addSql(`
      create table "elector_attachments" (
        "id" uuid not null,
        "elector_id" uuid not null,
        "file_id" uuid not null,
        "type" varchar(255) not null,
        "created_at" timestamptz not null,
        constraint "elector_attachments_pkey" primary key ("id"),
        constraint "elector_attachments_elector_id_file_id_unique" unique ("elector_id", "file_id"),
        constraint "elector_attachments_type_check" check ("type" in ('SIGNATURE', 'ETC'))
      );
    `);

    this.addSql(`
      create table "candidate_attachments" (
        "id" uuid not null,
        "candidate_id" uuid not null,
        "file_id" uuid not null,
        "type" varchar(255) not null,
        "sort_order" int not null,
        "created_at" timestamptz not null,
        constraint "candidate_attachments_pkey" primary key ("id"),
        constraint "candidate_attachments_candidate_id_file_id_unique" unique ("candidate_id", "file_id"),
        constraint "candidate_attachments_type_check" check ("type" in ('PROFILE_IMAGE', 'PLEDGE', 'POSTER', 'ETC'))
      );
    `);

    this.addSql(`
      create table "elector_identity_verifications" (
        "id" uuid not null,
        "elector_id" uuid not null,
        "provider" varchar(255) not null,
        "method" varchar(255) not null,
        "status" varchar(255) not null,
        "provider_transaction_id" varchar(255) null,
        "ci_hash" varchar(255) null,
        "di_hash" varchar(255) null,
        "phone_hash" varchar(255) null,
        "failure_reason" varchar(255) null,
        "ip_address" varchar(255) null,
        "user_agent" text null,
        "requested_at" timestamptz not null,
        "verified_at" timestamptz null,
        "created_at" timestamptz not null,
        constraint "elector_identity_verifications_pkey" primary key ("id"),
        constraint "elector_identity_verifications_provider_check" check ("provider" in ('PASS', 'KAKAO_CERT', 'NAVER_CERT', 'TOSS_CERT', 'SMS', 'ETC')),
        constraint "elector_identity_verifications_method_check" check ("method" in ('MOBILE', 'CERTIFICATE', 'SMS', 'EMAIL', 'ADMIN')),
        constraint "elector_identity_verifications_status_check" check ("status" in ('SUCCESS', 'FAILED', 'CANCELED'))
      );
    `);

    this.addSql(`
      create table "vote_content_change_histories" (
        "id" uuid not null,
        "vote_id" uuid not null,
        "vote_detail_id" uuid null,
        "candidate_id" uuid null,
        "vote_attachment_id" uuid null,
        "candidate_attachment_id" uuid null,
        "target_type" varchar(255) not null,
        "action" varchar(255) not null,
        "field_name" varchar(255) null,
        "old_value" jsonb null,
        "new_value" jsonb null,
        "snapshot_before" jsonb null,
        "snapshot_after" jsonb null,
        "change_reason" varchar(255) null,
        "actor_type" varchar(255) not null,
        "actor_id" varchar(255) null,
        "changed_at" timestamptz not null,
        "created_at" timestamptz not null,
        constraint "vote_content_change_histories_pkey" primary key ("id"),
        constraint "vote_content_change_histories_target_type_check" check ("target_type" in ('VOTE', 'VOTE_DETAIL', 'CANDIDATE', 'VOTE_ATTACHMENT', 'CANDIDATE_ATTACHMENT')),
        constraint "vote_content_change_histories_action_check" check ("action" in ('CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGED', 'POLICY_CHANGED')),
        constraint "vote_content_change_histories_actor_type_check" check ("actor_type" in ('ADMIN', 'SYSTEM'))
      );
    `);

    this.addSql(`
      create table "vote_result_storage_records" (
        "id" uuid not null,
        "vote_detail_id" uuid not null,
        "storage_mode" varchar(255) not null,
        "status" varchar(255) not null,
        "result_snapshot" jsonb not null,
        "result_hash" varchar(255) not null,
        "blockchain_network" varchar(255) null,
        "blockchain_contract_address" varchar(255) null,
        "blockchain_tx_hash" varchar(255) null,
        "blockchain_block_number" varchar(255) null,
        "blockchain_recorded_at" timestamptz null,
        "error_message" text null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "vote_result_storage_records_pkey" primary key ("id"),
        constraint "vote_result_storage_records_storage_mode_check" check ("storage_mode" in ('DATABASE', 'BLOCKCHAIN')),
        constraint "vote_result_storage_records_status_check" check ("status" in ('PENDING', 'SAVED', 'FAILED'))
      );
    `);

    this.addSql(
      'create index "vote_details_vote_id_index" on "vote_details" ("vote_id");',
    );
    this.addSql(
      'create index "electors_vote_id_index" on "electors" ("vote_id");',
    );
    this.addSql(
      'create index "candidates_vote_detail_id_index" on "candidates" ("vote_detail_id");',
    );
    this.addSql(
      'create index "vote_participations_vote_detail_id_index" on "vote_participations" ("vote_detail_id");',
    );
    this.addSql(
      'create index "vote_participations_elector_id_index" on "vote_participations" ("elector_id");',
    );
    this.addSql(
      'create index "vote_participations_candidate_id_index" on "vote_participations" ("candidate_id");',
    );
    this.addSql(
      'create unique index "vote_participations_vote_detail_id_group_key_unique" on "vote_participations" ("vote_detail_id", "group_key") where "group_key" is not null;',
    );
    this.addSql(
      'create index "vote_results_vote_detail_id_index" on "vote_results" ("vote_detail_id");',
    );
    this.addSql(
      'create index "vote_results_candidate_id_index" on "vote_results" ("candidate_id");',
    );
    this.addSql(
      'create index "vote_attachments_vote_id_index" on "vote_attachments" ("vote_id");',
    );
    this.addSql(
      'create index "vote_attachments_file_id_index" on "vote_attachments" ("file_id");',
    );
    this.addSql(
      'create index "elector_attachments_elector_id_index" on "elector_attachments" ("elector_id");',
    );
    this.addSql(
      'create index "elector_attachments_file_id_index" on "elector_attachments" ("file_id");',
    );
    this.addSql(
      `create unique index "elector_attachments_elector_id_signature_unique" on "elector_attachments" ("elector_id", "type") where "type" = 'SIGNATURE';`,
    );
    this.addSql(
      'create index "candidate_attachments_candidate_id_index" on "candidate_attachments" ("candidate_id");',
    );
    this.addSql(
      'create index "candidate_attachments_file_id_index" on "candidate_attachments" ("file_id");',
    );
    this.addSql(
      'create index "elector_identity_verifications_elector_id_index" on "elector_identity_verifications" ("elector_id");',
    );
    this.addSql(
      'create unique index "elector_identity_verifications_provider_transaction_unique" on "elector_identity_verifications" ("provider", "provider_transaction_id") where "provider_transaction_id" is not null;',
    );
    this.addSql(
      'create index "vote_content_change_histories_vote_id_index" on "vote_content_change_histories" ("vote_id");',
    );
    this.addSql(
      'create index "vote_content_change_histories_vote_detail_id_index" on "vote_content_change_histories" ("vote_detail_id");',
    );
    this.addSql(
      'create index "vote_content_change_histories_candidate_id_index" on "vote_content_change_histories" ("candidate_id");',
    );
    this.addSql(
      'create index "vote_content_change_histories_vote_attachment_id_index" on "vote_content_change_histories" ("vote_attachment_id");',
    );
    this.addSql(
      'create index "vote_content_change_histories_candidate_attachment_id_index" on "vote_content_change_histories" ("candidate_attachment_id");',
    );
    this.addSql(
      'create index "vote_result_storage_records_vote_detail_id_index" on "vote_result_storage_records" ("vote_detail_id");',
    );
    this.addSql(
      'create unique index "vote_result_storage_records_blockchain_tx_hash_unique" on "vote_result_storage_records" ("blockchain_tx_hash") where "blockchain_tx_hash" is not null;',
    );

    this.addSql(
      'alter table "vote_details" add constraint "vote_details_vote_id_foreign" foreign key ("vote_id") references "votes" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "electors" add constraint "electors_vote_id_foreign" foreign key ("vote_id") references "votes" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "candidates" add constraint "candidates_vote_detail_id_foreign" foreign key ("vote_detail_id") references "vote_details" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "vote_participations" add constraint "vote_participations_vote_detail_id_foreign" foreign key ("vote_detail_id") references "vote_details" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "vote_participations" add constraint "vote_participations_elector_id_foreign" foreign key ("elector_id") references "electors" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "vote_participations" add constraint "vote_participations_candidate_id_foreign" foreign key ("candidate_id") references "candidates" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'alter table "vote_results" add constraint "vote_results_vote_detail_id_foreign" foreign key ("vote_detail_id") references "vote_details" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "vote_results" add constraint "vote_results_candidate_id_foreign" foreign key ("candidate_id") references "candidates" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "vote_attachments" add constraint "vote_attachments_vote_id_foreign" foreign key ("vote_id") references "votes" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "vote_attachments" add constraint "vote_attachments_file_id_foreign" foreign key ("file_id") references "files" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "elector_attachments" add constraint "elector_attachments_elector_id_foreign" foreign key ("elector_id") references "electors" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "elector_attachments" add constraint "elector_attachments_file_id_foreign" foreign key ("file_id") references "files" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "candidate_attachments" add constraint "candidate_attachments_candidate_id_foreign" foreign key ("candidate_id") references "candidates" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "candidate_attachments" add constraint "candidate_attachments_file_id_foreign" foreign key ("file_id") references "files" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "elector_identity_verifications" add constraint "elector_identity_verifications_elector_id_foreign" foreign key ("elector_id") references "electors" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "vote_content_change_histories" add constraint "vote_content_change_histories_vote_id_foreign" foreign key ("vote_id") references "votes" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "vote_content_change_histories" add constraint "vote_content_change_histories_vote_detail_id_foreign" foreign key ("vote_detail_id") references "vote_details" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'alter table "vote_content_change_histories" add constraint "vote_content_change_histories_candidate_id_foreign" foreign key ("candidate_id") references "candidates" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'alter table "vote_content_change_histories" add constraint "vote_content_change_histories_vote_attachment_id_foreign" foreign key ("vote_attachment_id") references "vote_attachments" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'alter table "vote_content_change_histories" add constraint "vote_content_change_histories_candidate_attachment_id_foreign" foreign key ("candidate_attachment_id") references "candidate_attachments" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'alter table "vote_result_storage_records" add constraint "vote_result_storage_records_vote_detail_id_foreign" foreign key ("vote_detail_id") references "vote_details" ("id") on update cascade on delete cascade;',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "vote_result_storage_records" cascade;');
    this.addSql(
      'drop table if exists "vote_content_change_histories" cascade;',
    );
    this.addSql(
      'drop table if exists "elector_identity_verifications" cascade;',
    );
    this.addSql('drop table if exists "candidate_attachments" cascade;');
    this.addSql('drop table if exists "elector_attachments" cascade;');
    this.addSql('drop table if exists "vote_attachments" cascade;');
    this.addSql('drop table if exists "files" cascade;');
    this.addSql('drop table if exists "vote_results" cascade;');
    this.addSql('drop table if exists "vote_participations" cascade;');
    this.addSql('drop table if exists "candidates" cascade;');
    this.addSql('drop table if exists "electors" cascade;');
    this.addSql('drop table if exists "vote_details" cascade;');
    this.addSql('drop table if exists "votes" cascade;');
  }
}
