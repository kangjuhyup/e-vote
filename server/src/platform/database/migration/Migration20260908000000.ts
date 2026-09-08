import { Migration } from '@mikro-orm/migrations';

export class Migration20260908000000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "sms_deliveries" add column "participation_invitation_generation" integer null;',
    );
    this.addSql(
      'alter table "sms_deliveries" add constraint "sms_deliveries_participation_invitation_generation_check" check ("participation_invitation_generation" is null or "participation_invitation_generation" > 0);',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "sms_deliveries" drop constraint if exists "sms_deliveries_participation_invitation_generation_check";',
    );
    this.addSql(
      'alter table "sms_deliveries" drop column if exists "participation_invitation_generation";',
    );
  }
}
