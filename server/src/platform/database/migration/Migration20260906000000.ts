import { Migration } from '@mikro-orm/migrations';

export class Migration20260906000000 extends Migration {
  override up(): void {
    this.addSql(
      `create index if not exists "votes_due_open_index" on "votes" ("started_at", "id") where "status" = 'FINALIZED' and "ended_at" > "started_at";`,
    );
    this.addSql(
      `create index if not exists "votes_due_close_index" on "votes" ("ended_at", "id") where "status" = 'OPEN' and "ended_at" > "started_at";`,
    );
  }

  override down(): void {
    this.addSql('drop index if exists "votes_due_open_index";');
    this.addSql('drop index if exists "votes_due_close_index";');
  }
}
