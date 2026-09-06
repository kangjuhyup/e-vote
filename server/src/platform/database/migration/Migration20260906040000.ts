import { Migration } from '@mikro-orm/migrations';

export class Migration20260906040000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "participation_invitations" alter column "expires_at" drop not null;',
    );
    this.addSql(
      'alter table "participation_invitations" add column if not exists "generation" integer not null default 1;',
    );
    this.addSql(
      'alter table "participation_invitations" add column if not exists "claimed_at" timestamptz null;',
    );
    this.addSql(
      'alter table "participation_invitations" add column if not exists "claimed_session_id" uuid null;',
    );
    this.addSql(
      'alter table "participation_invitations" add column if not exists "issued_by_user_principal_id" varchar(255) null;',
    );
    this.addSql(
      'alter table "participation_invitations" add column if not exists "signing_key_id" varchar(100) null;',
    );
    this.addSql(`
      update "participation_invitations"
      set "generation" = 0,
          "revoked_at" = coalesce("revoked_at", clock_timestamp()),
          "claimed_at" = null,
          "claimed_session_id" = null
      where "issued_by_user_principal_id" is null;
    `);

    this.addSql(`
      create table if not exists "elector_participant_sessions" (
        "id" uuid not null,
        "token_digest" varchar(64) not null,
        "csrf_token_digest" varchar(64) not null,
        "invitation_id" uuid not null,
        "vote_id" uuid not null,
        "elector_id" uuid not null,
        "invitation_generation" integer not null,
        "scope" varchar(32) not null,
        "expires_at" timestamptz not null,
        "revoked_at" timestamptz null,
        "created_at" timestamptz not null,
        "last_used_at" timestamptz not null,
        constraint "elector_participant_sessions_pkey" primary key ("id"),
        constraint "elector_participant_sessions_token_digest_unique" unique ("token_digest"),
        constraint "elector_participant_sessions_scope_check" check ("scope" in ('PARTICIPATE', 'RESULT_READ')),
        constraint "elector_participant_sessions_generation_check" check ("invitation_generation" > 0),
        constraint "elector_participant_sessions_invitation_id_foreign" foreign key ("invitation_id") references "participation_invitations" ("id") on update cascade on delete cascade,
        constraint "elector_participant_sessions_vote_id_foreign" foreign key ("vote_id") references "votes" ("id") on update cascade on delete cascade,
        constraint "elector_participant_sessions_elector_id_foreign" foreign key ("elector_id") references "electors" ("id") on update cascade on delete cascade
      );
    `);
    this.addSql(
      `create unique index if not exists "elector_participant_sessions_active_participate_unique" on "elector_participant_sessions" ("vote_id", "elector_id", "invitation_generation") where "scope" = 'PARTICIPATE' and "revoked_at" is null;`,
    );
    this.addSql(
      'create index if not exists "elector_participant_sessions_expires_at_index" on "elector_participant_sessions" ("expires_at") where "revoked_at" is null;',
    );

    this.addSql(`
      create table if not exists "participation_invitation_deliveries" (
        "id" uuid not null,
        "invitation_id" uuid not null,
        "invitation_generation" integer not null,
        "status" varchar(32) not null,
        "available_at" timestamptz not null,
        "attempt_count" integer not null default 0,
        "locked_by" varchar(255) null,
        "lock_token" uuid null,
        "locked_until" timestamptz null,
        "delivered_at" timestamptz null,
        "last_error" text null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "participation_invitation_deliveries_pkey" primary key ("id"),
        constraint "participation_invitation_deliveries_invitation_generation_unique" unique ("invitation_id", "invitation_generation"),
        constraint "participation_invitation_deliveries_status_check" check ("status" in ('PENDING', 'PROCESSING', 'SENT', 'SKIPPED', 'DEAD')),
        constraint "participation_invitation_deliveries_generation_check" check ("invitation_generation" > 0),
        constraint "participation_invitation_deliveries_invitation_id_foreign" foreign key ("invitation_id") references "participation_invitations" ("id") on update cascade on delete cascade
      );
    `);
    this.addSql(
      'create index if not exists "participation_invitation_deliveries_claim_index" on "participation_invitation_deliveries" ("available_at", "created_at") where "status" in (\'PENDING\', \'PROCESSING\');',
    );

    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint
          where conname = 'participation_invitations_claimed_session_id_foreign'
            and conrelid = 'participation_invitations'::regclass
        ) then
          alter table "participation_invitations"
            add constraint "participation_invitations_claimed_session_id_foreign"
            foreign key ("claimed_session_id") references "elector_participant_sessions" ("id")
            on update cascade on delete set null;
        end if;
      end $$;
    `);
  }

  override down(): void {
    this.addSql('select 1;');
  }
}
