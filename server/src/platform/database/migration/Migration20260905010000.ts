import { Migration } from '@mikro-orm/migrations';

export class Migration20260905010000 extends Migration {
  override up(): void {
    this.addSql('drop index if exists "billing_orders_vote_unique";');
    this.addSql(
      `create unique index "billing_orders_vote_active_unique" on "billing_orders" ("vote_id") where "status" in ('PENDING_PAYMENT', 'PAID', 'REFUND_PENDING');`,
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
    this.addSql(`
      do $$
      begin
        if exists (
          select 1 from "billing_orders" group by "vote_id" having count(*) > 1
        ) then
          raise exception 'cannot restore one-order-per-vote constraint while billing history contains multiple orders';
        end if;
      end $$;
    `);
    this.addSql('drop index if exists "billing_orders_vote_active_unique";');
    this.addSql(
      'create unique index "billing_orders_vote_unique" on "billing_orders" ("vote_id");',
    );
    this.addSql(
      'update "votes" set "status" = \'DRAFT\' where "status" = \'FINALIZED\';',
    );
    this.addSql(
      'alter table "votes" drop constraint if exists "votes_status_check";',
    );
    this.addSql(
      `alter table "votes" add constraint "votes_status_check" check ("status" in ('DRAFT', 'OPEN', 'CLOSED', 'CANCELED'));`,
    );
  }
}
