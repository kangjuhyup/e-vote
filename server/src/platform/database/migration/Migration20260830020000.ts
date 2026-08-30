import { Migration } from '@mikro-orm/migrations';

export class Migration20260830020000 extends Migration {
  override up(): void {
    this.addSql(`
      create table "billing_orders" (
        "id" uuid not null,
        "vote_id" uuid not null,
        "commission_id" uuid not null,
        "ordered_by_user_principal_id" varchar(255) not null,
        "product_code" varchar(255) not null,
        "product_name" varchar(255) not null,
        "elector_count" integer not null,
        "pricing_unit_size" integer not null,
        "pricing_unit_count" integer not null,
        "unit_price" integer not null,
        "amount" integer not null,
        "currency" varchar(3) not null,
        "status" varchar(32) not null,
        "payment_id" varchar(255) null,
        "issued_at" timestamptz not null,
        "paid_at" timestamptz null,
        "refunded_at" timestamptz null,
        "updated_at" timestamptz not null,
        constraint "billing_orders_pkey" primary key ("id"),
        constraint "billing_orders_elector_count_positive" check ("elector_count" > 0),
        constraint "billing_orders_pricing_unit_size_positive" check ("pricing_unit_size" > 0),
        constraint "billing_orders_pricing_unit_count_valid" check ("pricing_unit_count" = ceil("elector_count"::numeric / "pricing_unit_size")::integer),
        constraint "billing_orders_unit_price_positive" check ("unit_price" > 0),
        constraint "billing_orders_amount_valid" check ("amount" = "unit_price" * "pricing_unit_count")
      );
    `);
    this.addSql(
      'create unique index "billing_orders_vote_unique" on "billing_orders" ("vote_id");',
    );
    this.addSql(
      'create unique index "billing_orders_payment_unique" on "billing_orders" ("payment_id") where "payment_id" is not null;',
    );
    this.addSql(
      'create index "billing_orders_commission_status_index" on "billing_orders" ("commission_id", "status");',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "billing_orders" cascade;');
  }
}
