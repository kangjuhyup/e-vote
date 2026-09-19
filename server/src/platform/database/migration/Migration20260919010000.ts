import { Migration } from '@mikro-orm/migrations';

export class Migration20260919010000 extends Migration {
  override up(): void {
    this.addSql(`create table "billing_payment_failures" (
      "billing_order_id" uuid not null primary key references "billing_orders" ("id") on delete cascade,
      "failure_code" varchar(64) not null,
      "failure_message" varchar(200),
      "reported_at" timestamptz not null
    );`);
  }

  override down(): void {
    this.addSql('drop table if exists "billing_payment_failures";');
  }
}
