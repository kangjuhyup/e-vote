import { Migration } from '@mikro-orm/migrations';

export class Migration20260906030000 extends Migration {
  override up(): void {
    this.addSql(`
      alter table "billing_orders"
        add column "blockchain_storage_count" integer not null default 0,
        add column "blockchain_storage_unit_price" integer not null default 3000;
    `);
    this.addSql(`
      alter table "billing_orders"
        drop constraint "billing_orders_amount_valid",
        add constraint "billing_orders_blockchain_storage_count_non_negative"
          check ("blockchain_storage_count" >= 0),
        add constraint "billing_orders_blockchain_storage_unit_price_positive"
          check ("blockchain_storage_unit_price" > 0),
        add constraint "billing_orders_amount_valid"
          check (
            "amount" =
              "unit_price" * "pricing_unit_count" +
              "blockchain_storage_unit_price" * "blockchain_storage_count"
          );
    `);
  }

  override down(): void {
    this.addSql(`
      do $$
      begin
        if exists (
          select 1
          from "billing_orders"
          where "blockchain_storage_count" <> 0
        ) then
          raise exception 'cannot remove blockchain billing snapshots';
        end if;
      end $$;
    `);
    this.addSql(`
      alter table "billing_orders"
        drop constraint "billing_orders_amount_valid",
        drop constraint "billing_orders_blockchain_storage_count_non_negative",
        drop constraint "billing_orders_blockchain_storage_unit_price_positive",
        add constraint "billing_orders_amount_valid"
          check ("amount" = "unit_price" * "pricing_unit_count"),
        drop column "blockchain_storage_count",
        drop column "blockchain_storage_unit_price";
    `);
  }
}
