import { Migration } from '@mikro-orm/migrations';

export class Migration20260813000000 extends Migration {
  override up(): void {
    this.addSql(`
      create table "election_commissions" (
        "id" uuid not null,
        "name" varchar(255) not null,
        "status" varchar(255) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "election_commissions_pkey" primary key ("id"),
        constraint "election_commissions_status_check" check ("status" in ('ACTIVE', 'SUSPENDED'))
      );
    `);

    this.addSql(`
      create table "election_commission_members" (
        "id" uuid not null,
        "commission_id" uuid not null,
        "name" varchar(255) not null,
        "role" varchar(255) not null,
        "status" varchar(255) not null,
        "registered_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "election_commission_members_pkey" primary key ("id"),
        constraint "election_commission_members_role_check" check ("role" in ('ADMIN', 'FIELD_MANAGER')),
        constraint "election_commission_members_status_check" check ("status" in ('ACTIVE', 'INACTIVE'))
      );
    `);

    this.addSql(
      'alter table "votes" add column "commission_id" uuid not null;',
    );

    this.addSql(`
      create table "vote_voting_channels" (
        "id" uuid not null,
        "vote_id" uuid not null,
        "channel" varchar(255) not null,
        "created_at" timestamptz not null,
        constraint "vote_voting_channels_pkey" primary key ("id"),
        constraint "vote_voting_channels_vote_id_channel_unique" unique ("vote_id", "channel"),
        constraint "vote_voting_channels_channel_check" check ("channel" in ('ONLINE', 'ONSITE', 'VISIT'))
      );
    `);

    this.addSql(`
      create table "field_voting_sessions" (
        "id" uuid not null,
        "commission_id" uuid not null,
        "vote_id" uuid not null,
        "channel" varchar(255) not null,
        "title" varchar(255) not null,
        "location_name" varchar(255) not null,
        "address" varchar(255) not null,
        "starts_at" timestamptz not null,
        "ends_at" timestamptz not null,
        "status" varchar(255) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "field_voting_sessions_pkey" primary key ("id"),
        constraint "field_voting_sessions_channel_check" check ("channel" in ('ONSITE', 'VISIT')),
        constraint "field_voting_sessions_time_range_check" check ("starts_at" < "ends_at"),
        constraint "field_voting_sessions_status_check" check ("status" in ('SCHEDULED', 'OPEN', 'CLOSED', 'CANCELED'))
      );
    `);

    this.addSql(`
      create table "field_voting_session_managers" (
        "id" uuid not null,
        "field_voting_session_id" uuid not null,
        "commission_member_id" uuid not null,
        "assigned_at" timestamptz not null,
        constraint "field_voting_session_managers_pkey" primary key ("id"),
        constraint "field_voting_session_managers_session_member_unique" unique ("field_voting_session_id", "commission_member_id")
      );
    `);

    this.addSql(
      `alter table "vote_participations" add column "voting_channel" varchar(255) not null default 'ONLINE';`,
    );
    this.addSql(
      'alter table "vote_participations" add column "field_voting_session_id" uuid null;',
    );
    this.addSql(
      `alter table "vote_participations" add constraint "vote_participations_voting_channel_check" check ("voting_channel" in ('ONLINE', 'ONSITE', 'VISIT'));`,
    );
    this.addSql(
      `alter table "vote_participations" add constraint "vote_participations_field_session_channel_check" check ((voting_channel = 'ONLINE' and field_voting_session_id is null) or (voting_channel in ('ONSITE', 'VISIT') and field_voting_session_id is not null));`,
    );

    this.addSql(`
      create table "field_participation_evidences" (
        "id" uuid not null,
        "participation_id" uuid not null,
        "field_voting_session_id" uuid not null,
        "verified_by_commission_member_id" uuid not null,
        "evidence_file_id" uuid null,
        "verification_note" text null,
        "verified_at" timestamptz not null,
        "created_at" timestamptz not null,
        constraint "field_participation_evidences_pkey" primary key ("id"),
        constraint "field_participation_evidences_participation_id_unique" unique ("participation_id")
      );
    `);

    this.addSql(
      'create index "election_commission_members_commission_id_index" on "election_commission_members" ("commission_id");',
    );
    this.addSql(
      'create index "votes_commission_id_index" on "votes" ("commission_id");',
    );
    this.addSql(
      'create index "vote_voting_channels_vote_id_index" on "vote_voting_channels" ("vote_id");',
    );
    this.addSql(
      'create index "field_voting_sessions_commission_id_index" on "field_voting_sessions" ("commission_id");',
    );
    this.addSql(
      'create index "field_voting_sessions_vote_id_index" on "field_voting_sessions" ("vote_id");',
    );
    this.addSql(
      'create index "field_voting_session_managers_session_id_index" on "field_voting_session_managers" ("field_voting_session_id");',
    );
    this.addSql(
      'create index "field_voting_session_managers_member_id_index" on "field_voting_session_managers" ("commission_member_id");',
    );
    this.addSql(
      'create index "vote_participations_field_voting_session_id_index" on "vote_participations" ("field_voting_session_id");',
    );
    this.addSql(
      'create index "field_participation_evidences_session_id_index" on "field_participation_evidences" ("field_voting_session_id");',
    );
    this.addSql(
      'create index "field_participation_evidences_verifier_id_index" on "field_participation_evidences" ("verified_by_commission_member_id");',
    );
    this.addSql(
      'create index "field_participation_evidences_file_id_index" on "field_participation_evidences" ("evidence_file_id");',
    );

    this.addSql(
      'alter table "election_commission_members" add constraint "election_commission_members_commission_id_foreign" foreign key ("commission_id") references "election_commissions" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "votes" add constraint "votes_commission_id_foreign" foreign key ("commission_id") references "election_commissions" ("id") on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table "vote_voting_channels" add constraint "vote_voting_channels_vote_id_foreign" foreign key ("vote_id") references "votes" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "field_voting_sessions" add constraint "field_voting_sessions_commission_id_foreign" foreign key ("commission_id") references "election_commissions" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "field_voting_sessions" add constraint "field_voting_sessions_vote_id_foreign" foreign key ("vote_id") references "votes" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "field_voting_session_managers" add constraint "field_voting_session_managers_session_id_foreign" foreign key ("field_voting_session_id") references "field_voting_sessions" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "field_voting_session_managers" add constraint "field_voting_session_managers_member_id_foreign" foreign key ("commission_member_id") references "election_commission_members" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "vote_participations" add constraint "vote_participations_field_voting_session_id_foreign" foreign key ("field_voting_session_id") references "field_voting_sessions" ("id") on update cascade on delete set null;',
    );
    this.addSql(
      'alter table "field_participation_evidences" add constraint "field_participation_evidences_participation_id_foreign" foreign key ("participation_id") references "vote_participations" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "field_participation_evidences" add constraint "field_participation_evidences_session_id_foreign" foreign key ("field_voting_session_id") references "field_voting_sessions" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "field_participation_evidences" add constraint "field_participation_evidences_verifier_id_foreign" foreign key ("verified_by_commission_member_id") references "election_commission_members" ("id") on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table "field_participation_evidences" add constraint "field_participation_evidences_file_id_foreign" foreign key ("evidence_file_id") references "files" ("id") on update cascade on delete set null;',
    );
  }

  override down(): void {
    this.addSql(
      'drop table if exists "field_participation_evidences" cascade;',
    );

    this.addSql(
      'alter table "vote_participations" drop constraint if exists "vote_participations_field_voting_session_id_foreign";',
    );
    this.addSql(
      'alter table "vote_participations" drop constraint if exists "vote_participations_field_session_channel_check";',
    );
    this.addSql(
      'alter table "vote_participations" drop constraint if exists "vote_participations_voting_channel_check";',
    );
    this.addSql(
      'drop index if exists "vote_participations_field_voting_session_id_index";',
    );
    this.addSql(
      'alter table "vote_participations" drop column if exists "field_voting_session_id";',
    );
    this.addSql(
      'alter table "vote_participations" drop column if exists "voting_channel";',
    );

    this.addSql(
      'drop table if exists "field_voting_session_managers" cascade;',
    );
    this.addSql('drop table if exists "field_voting_sessions" cascade;');
    this.addSql('drop table if exists "vote_voting_channels" cascade;');

    this.addSql(
      'alter table "votes" drop constraint if exists "votes_commission_id_foreign";',
    );
    this.addSql('drop index if exists "votes_commission_id_index";');
    this.addSql('alter table "votes" drop column if exists "commission_id";');

    this.addSql('drop table if exists "election_commission_members" cascade;');
    this.addSql('drop table if exists "election_commissions" cascade;');
  }
}
