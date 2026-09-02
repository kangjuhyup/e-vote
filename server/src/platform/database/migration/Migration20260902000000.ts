import { Migration } from '@mikro-orm/migrations';

export class Migration20260902000000 extends Migration {
  override up(): void {
    this.addSql(`
      create table "electoral_roll_access_grants" (
        "id" uuid not null,
        "electoral_roll_id" uuid not null,
        "user_principal_id" varchar(255) not null,
        "granted_at" timestamptz not null,
        constraint "electoral_roll_access_grants_pkey" primary key ("id"),
        constraint "electoral_roll_access_grants_roll_principal_unique" unique ("electoral_roll_id", "user_principal_id")
      );
    `);
    this.addSql(
      'create index "electoral_roll_access_grants_principal_roll_index" on "electoral_roll_access_grants" ("user_principal_id", "electoral_roll_id");',
    );
    this.addSql(
      'alter table "electoral_roll_access_grants" add constraint "electoral_roll_access_grants_roll_id_foreign" foreign key ("electoral_roll_id") references "electoral_rolls" ("id") on update cascade on delete cascade;',
    );

    this.addSql(`
      insert into "electoral_roll_access_grants" (
        "id",
        "electoral_roll_id",
        "user_principal_id",
        "granted_at"
      )
      select distinct
        md5(er."id"::text || ':' || ecm."user_principal_id")::uuid,
        er."id",
        ecm."user_principal_id",
        er."created_at"
      from "electoral_rolls" er
      inner join "election_commission_members" ecm
        on ecm."commission_id" = er."commission_id"
      where ecm."status" = 'ACTIVE'
        and ecm."user_principal_id" is not null
      on conflict ("electoral_roll_id", "user_principal_id") do nothing;
    `);

    this.addSql(
      'drop index if exists "electoral_roll_snapshots_commission_id_index";',
    );
    this.addSql(
      'alter table "electoral_roll_snapshots" drop constraint if exists "electoral_roll_snapshots_commission_id_foreign";',
    );
    this.addSql(
      'alter table "electoral_roll_snapshots" drop column if exists "commission_id";',
    );
    this.addSql('drop index if exists "electoral_rolls_commission_id_index";');
    this.addSql(
      'alter table "electoral_rolls" drop constraint if exists "electoral_rolls_commission_id_foreign";',
    );
    this.addSql(
      'alter table "electoral_rolls" drop column if exists "commission_id";',
    );
  }

  override down(): void {
    this.addSql(
      'alter table "electoral_rolls" add column "commission_id" uuid null;',
    );
    this.addSql(`
      update "electoral_rolls" er
      set "commission_id" = inferred."commission_id"
      from (
        select era."electoral_roll_id", min(ecm."commission_id"::text)::uuid as "commission_id"
        from "electoral_roll_access_grants" era
        inner join "election_commission_members" ecm
          on ecm."user_principal_id" = era."user_principal_id"
        group by era."electoral_roll_id"
      ) inferred
      where inferred."electoral_roll_id" = er."id";
    `);
    this.addSql(
      'create index "electoral_rolls_commission_id_index" on "electoral_rolls" ("commission_id");',
    );
    this.addSql(
      'alter table "electoral_rolls" add constraint "electoral_rolls_commission_id_foreign" foreign key ("commission_id") references "election_commissions" ("id") on update cascade on delete restrict;',
    );

    this.addSql(
      'alter table "electoral_roll_snapshots" add column "commission_id" uuid null;',
    );
    this.addSql(`
      update "electoral_roll_snapshots" ers
      set "commission_id" = er."commission_id"
      from "electoral_rolls" er
      where er."id" = ers."source_roll_id";
    `);
    this.addSql(
      'create index "electoral_roll_snapshots_commission_id_index" on "electoral_roll_snapshots" ("commission_id");',
    );
    this.addSql(
      'alter table "electoral_roll_snapshots" add constraint "electoral_roll_snapshots_commission_id_foreign" foreign key ("commission_id") references "election_commissions" ("id") on update cascade on delete restrict;',
    );

    this.addSql('drop table if exists "electoral_roll_access_grants" cascade;');
  }
}
