import { Migration } from '@mikro-orm/migrations';

export class Migration20260919000000 extends Migration {
  override up(): void {
    this.addSql(
      `create index if not exists "votes_due_payment_expiration_index" on "votes" ("started_at", "id") where "status" = 'DRAFT' and "billing_order_id" is not null;`,
    );
  }

  override down(): void {
    this.addSql('drop index if exists "votes_due_payment_expiration_index";');
  }
}
