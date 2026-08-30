import { Migration } from '@mikro-orm/migrations';

export class Migration20260830020000 extends Migration {
  override up(): void {
    this.addSql(`
      create table "sms_dispatches" (
        "id" uuid not null,
        "vote_id" uuid not null,
        "field_voting_session_id" uuid null,
        "purpose" varchar(255) not null,
        "sent_at" timestamptz not null,
        "recipient_count" int not null,
        "success_count" int not null,
        "failure_count" int not null,
        "created_at" timestamptz not null,
        constraint "sms_dispatches_pkey" primary key ("id"),
        constraint "sms_dispatches_purpose_check" check ("purpose" in ('VOTE_PARTICIPATION_REMINDER', 'VOTE_RESULT_NOTICE', 'UPCOMING_VOTE_NOTICE', 'FIELD_VOTING_SESSION_NOTICE')),
        constraint "sms_dispatches_counts_check" check ("recipient_count" >= 0 and "success_count" >= 0 and "failure_count" >= 0 and "recipient_count" = "success_count" + "failure_count"),
        constraint "sms_dispatches_field_session_check" check (("purpose" = 'FIELD_VOTING_SESSION_NOTICE') = ("field_voting_session_id" is not null))
      );
    `);
    this.addSql(`
      create table "sms_deliveries" (
        "id" uuid not null,
        "dispatch_id" uuid not null,
        "elector_id" uuid not null,
        "recipient_name" varchar(255) not null,
        "recipient_identifier" varchar(255) not null,
        "status" varchar(255) not null,
        "failure_reason" text null,
        "created_at" timestamptz not null,
        constraint "sms_deliveries_pkey" primary key ("id"),
        constraint "sms_deliveries_dispatch_id_elector_id_unique" unique ("dispatch_id", "elector_id"),
        constraint "sms_deliveries_status_check" check ("status" in ('SUCCESS', 'FAILURE')),
        constraint "sms_deliveries_failure_reason_check" check (("status" = 'SUCCESS' and "failure_reason" is null) or ("status" = 'FAILURE' and length(trim("failure_reason")) > 0))
      );
    `);

    this.addSql(
      'create index "sms_dispatches_vote_id_sent_at_index" on "sms_dispatches" ("vote_id", "sent_at" desc, "id" desc);',
    );
    this.addSql(
      'create index "sms_deliveries_dispatch_id_index" on "sms_deliveries" ("dispatch_id");',
    );

    this.addSql(
      'alter table "sms_dispatches" add constraint "sms_dispatches_vote_id_foreign" foreign key ("vote_id") references "votes" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "sms_dispatches" add constraint "sms_dispatches_field_voting_session_id_foreign" foreign key ("field_voting_session_id") references "field_voting_sessions" ("id") on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table "sms_deliveries" add constraint "sms_deliveries_dispatch_id_foreign" foreign key ("dispatch_id") references "sms_dispatches" ("id") on update cascade on delete cascade;',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "sms_deliveries" cascade;');
    this.addSql('drop table if exists "sms_dispatches" cascade;');
  }
}
