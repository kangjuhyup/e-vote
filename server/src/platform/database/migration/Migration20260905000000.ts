import { Migration } from '@mikro-orm/migrations';

export class Migration20260905000000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "votes" add column "created_by_user_principal_id" varchar(255) null;',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "votes" drop column if exists "created_by_user_principal_id";',
    );
  }
}
