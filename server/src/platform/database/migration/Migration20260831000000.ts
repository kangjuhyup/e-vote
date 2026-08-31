import { Migration } from '@mikro-orm/migrations';

export class Migration20260831000000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "votes" add column "billing_order_id" uuid null, add column "finalized_at" timestamptz null;',
    );
    this.addSql(
      'create unique index "votes_billing_order_unique" on "votes" ("billing_order_id") where "billing_order_id" is not null;',
    );
    this.addSql(
      'update "votes" as "v" set "billing_order_id" = "bo"."id", "finalized_at" = "bo"."issued_at" from "billing_orders" as "bo" where "bo"."vote_id" = "v"."id";',
    );

    this.addSql(
      'alter table "billing_orders" add column "cancellation_window_days" integer null, add column "cancelable_until" timestamptz null, add column "canceled_at" timestamptz null, add column "cancellation_reason" text null, add column "refund_requested_at" timestamptz null;',
    );
    this.addSql(
      'update "billing_orders" set "cancellation_window_days" = 7, "cancelable_until" = "issued_at" + interval \'7 days\';',
    );
    this.addSql(
      'update "billing_orders" set "canceled_at" = coalesce("refunded_at", "paid_at", "issued_at"), "cancellation_reason" = \'LEGACY_REFUND\', "refund_requested_at" = coalesce("refunded_at", "paid_at", "issued_at") where "status" = \'REFUNDED\';',
    );
    this.addSql(
      'alter table "billing_orders" alter column "cancellation_window_days" set not null, alter column "cancelable_until" set not null;',
    );
    this.addSql(
      'alter table "billing_orders" add constraint "billing_orders_cancellation_window_positive" check ("cancellation_window_days" > 0);',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "billing_orders" drop constraint if exists "billing_orders_cancellation_window_positive";',
    );
    this.addSql(
      'alter table "billing_orders" drop column if exists "cancellation_window_days", drop column if exists "cancelable_until", drop column if exists "canceled_at", drop column if exists "cancellation_reason", drop column if exists "refund_requested_at";',
    );
    this.addSql('drop index if exists "votes_billing_order_unique";');
    this.addSql(
      'alter table "votes" drop column if exists "billing_order_id", drop column if exists "finalized_at";',
    );
  }
}
