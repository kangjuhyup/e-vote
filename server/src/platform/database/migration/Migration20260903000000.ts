import { Migration } from '@mikro-orm/migrations';

export class Migration20260903000000 extends Migration {
  override up(): void {
    this.addSql(`
      alter table "electoral_roll_members"
        add column "encrypted_name" text null,
        add column "encrypted_phone_number" text null,
        add column "encrypted_birth_date" text null,
        add column "identity_name_hash" varchar(255) null,
        add column "identity_phone_number_hash" varchar(255) null,
        add column "identity_birth_date_hash" varchar(255) null;
    `);
    this.addSql(`
      alter table "electoral_roll_snapshot_members"
        add column "encrypted_name" text null,
        add column "encrypted_phone_number" text null,
        add column "encrypted_birth_date" text null,
        add column "identity_name_hash" varchar(255) null,
        add column "identity_phone_number_hash" varchar(255) null,
        add column "identity_birth_date_hash" varchar(255) null;
    `);

    this.addSql(`
      alter table "electors"
        add column "identity_name_hash" varchar(255) null,
        add column "identity_birth_date_hash" varchar(255) null;
    `);
  }

  override down(): void {
    this.addSql(`
      alter table "electors"
        drop column if exists "identity_birth_date_hash",
        drop column if exists "identity_name_hash";
    `);

    this.addSql(`
      alter table "electoral_roll_snapshot_members"
        drop column if exists "identity_birth_date_hash",
        drop column if exists "identity_phone_number_hash",
        drop column if exists "identity_name_hash",
        drop column if exists "encrypted_birth_date",
        drop column if exists "encrypted_phone_number",
        drop column if exists "encrypted_name";
    `);
    this.addSql(`
      alter table "electoral_roll_members"
        drop column if exists "identity_birth_date_hash",
        drop column if exists "identity_phone_number_hash",
        drop column if exists "identity_name_hash",
        drop column if exists "encrypted_birth_date",
        drop column if exists "encrypted_phone_number",
        drop column if exists "encrypted_name";
    `);
  }
}
