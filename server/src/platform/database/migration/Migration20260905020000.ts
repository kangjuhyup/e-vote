import { Migration } from '@mikro-orm/migrations';

/**
 * Reconciles two historical migrations that were published with the same
 * Migration20260905010000 identifier. Some databases ran the participation
 * schema while others ran the billing-finalization schema, but both record the
 * same migration name. Keep the old migration immutable and repair both sides
 * under this new, globally unique identity.
 */
export class Migration20260905020000 extends Migration {
  override up(): void {
    this.addSql(`
      create table if not exists "participation_invitations" (
        "id" uuid not null,
        "vote_id" uuid not null,
        "elector_id" uuid not null,
        "token_digest" varchar(255) not null,
        "expires_at" timestamptz not null,
        "revoked_at" timestamptz null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "participation_invitations_pkey" primary key ("id"),
        constraint "participation_invitations_token_digest_unique" unique ("token_digest"),
        constraint "participation_invitations_vote_id_elector_id_unique" unique ("vote_id", "elector_id")
      );
    `);
    this.addSql(
      'create index if not exists "participation_invitations_expires_at_index" on "participation_invitations" ("expires_at");',
    );
    this.addSql(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint
          where conname = 'participation_invitations_vote_id_foreign'
            and conrelid = 'participation_invitations'::regclass
        ) then
          alter table "participation_invitations"
            add constraint "participation_invitations_vote_id_foreign"
            foreign key ("vote_id") references "votes" ("id")
            on update cascade on delete cascade;
        end if;
        if not exists (
          select 1 from pg_constraint
          where conname = 'participation_invitations_elector_id_foreign'
            and conrelid = 'participation_invitations'::regclass
        ) then
          alter table "participation_invitations"
            add constraint "participation_invitations_elector_id_foreign"
            foreign key ("elector_id") references "electors" ("id")
            on update cascade on delete cascade;
        end if;
      end $$;
    `);

    this.addSql('drop index if exists "billing_orders_vote_unique";');
    this.addSql(
      `create unique index if not exists "billing_orders_vote_active_unique" on "billing_orders" ("vote_id") where "status" in ('PENDING_PAYMENT', 'PAID', 'REFUND_PENDING');`,
    );
    this.addSql(
      'alter table "votes" drop constraint if exists "votes_status_check";',
    );
    this.addSql(
      `alter table "votes" add constraint "votes_status_check" check ("status" in ('DRAFT', 'FINALIZED', 'OPEN', 'CLOSED', 'CANCELED'));`,
    );

    this.addSql(`
      update "votes" as "v"
      set "status" = case when "v"."status" = 'CANCELED' then 'DRAFT' else "v"."status" end,
          "finalized_at" = null
      from "billing_orders" as "bo"
      where "v"."billing_order_id" = "bo"."id"
        and "bo"."status" = 'PENDING_PAYMENT'
        and "v"."status" in ('DRAFT', 'CANCELED');
    `);
    this.addSql(`
      update "votes" as "v"
      set "status" = case when "v"."status" in ('DRAFT', 'CANCELED') then 'FINALIZED' else "v"."status" end,
          "finalized_at" = coalesce("bo"."paid_at", "v"."finalized_at", "bo"."issued_at")
      from "billing_orders" as "bo"
      where "v"."billing_order_id" = "bo"."id"
        and "bo"."status" in ('PAID', 'REFUND_PENDING');
    `);
    this.addSql(`
      update "votes" as "v"
      set "status" = case when "v"."status" in ('CANCELED', 'FINALIZED') then 'DRAFT' else "v"."status" end,
          "billing_order_id" = null,
          "finalized_at" = null
      from "billing_orders" as "bo"
      where "v"."billing_order_id" = "bo"."id"
        and "bo"."status" in ('CANCELED', 'REFUNDED');
    `);
  }

  override down(): void {
    // Forward-only reconciliation: either schema may predate this migration
    // under the collided identifier, so rolling it back cannot be made safe.
    this.addSql('select 1;');
  }
}
