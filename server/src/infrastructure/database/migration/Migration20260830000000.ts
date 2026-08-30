import { Migration } from '@mikro-orm/migrations';

export class Migration20260830000000 extends Migration {
  override up(): void {
    this.addSql(`
      create table "electoral_rolls" (
        "id" uuid not null,
        "commission_id" uuid not null,
        "name" varchar(255) not null,
        "revision" int not null default 1,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "electoral_rolls_pkey" primary key ("id"),
        constraint "electoral_rolls_revision_positive_check" check ("revision" > 0)
      );
    `);
    this.addSql(`
      create table "electoral_roll_members" (
        "id" uuid not null,
        "electoral_roll_id" uuid not null,
        "identifier" varchar(255) not null,
        "group_key" varchar(255) null,
        "vote_weight" numeric(20, 6) not null default 1,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "electoral_roll_members_pkey" primary key ("id"),
        constraint "electoral_roll_members_roll_id_identifier_unique" unique ("electoral_roll_id", "identifier"),
        constraint "electoral_roll_members_vote_weight_positive_check" check ("vote_weight" > 0)
      );
    `);
    this.addSql(`
      create table "electoral_roll_snapshots" (
        "id" uuid not null,
        "source_roll_id" uuid not null,
        "commission_id" uuid not null,
        "roll_name" varchar(255) not null,
        "source_revision" int not null,
        "member_count" int not null,
        "content_hash" varchar(64) not null,
        "created_at" timestamptz not null,
        constraint "electoral_roll_snapshots_pkey" primary key ("id"),
        constraint "electoral_roll_snapshots_roll_id_revision_unique" unique ("source_roll_id", "source_revision"),
        constraint "electoral_roll_snapshots_revision_positive_check" check ("source_revision" > 0),
        constraint "electoral_roll_snapshots_member_count_non_negative_check" check ("member_count" >= 0),
        constraint "electoral_roll_snapshots_content_hash_check" check ("content_hash" ~ '^[0-9a-f]{64}$')
      );
    `);
    this.addSql(`
      create table "electoral_roll_snapshot_members" (
        "id" uuid not null,
        "snapshot_id" uuid not null,
        "source_member_id" uuid not null,
        "identifier" varchar(255) not null,
        "group_key" varchar(255) null,
        "vote_weight" numeric(20, 6) not null default 1,
        "created_at" timestamptz not null,
        constraint "electoral_roll_snapshot_members_pkey" primary key ("id"),
        constraint "electoral_roll_snapshot_members_snapshot_id_identifier_unique" unique ("snapshot_id", "identifier"),
        constraint "electoral_roll_snapshot_members_vote_weight_positive_check" check ("vote_weight" > 0)
      );
    `);

    this.addSql(
      'create index "electoral_rolls_commission_id_index" on "electoral_rolls" ("commission_id");',
    );
    this.addSql(
      'create index "electoral_roll_members_roll_id_index" on "electoral_roll_members" ("electoral_roll_id");',
    );
    this.addSql(
      'create index "electoral_roll_snapshots_commission_id_index" on "electoral_roll_snapshots" ("commission_id");',
    );
    this.addSql(
      'create index "electoral_roll_snapshot_members_snapshot_id_index" on "electoral_roll_snapshot_members" ("snapshot_id");',
    );

    this.addSql(
      'alter table "electoral_rolls" add constraint "electoral_rolls_commission_id_foreign" foreign key ("commission_id") references "election_commissions" ("id") on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table "electoral_roll_members" add constraint "electoral_roll_members_roll_id_foreign" foreign key ("electoral_roll_id") references "electoral_rolls" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "electoral_roll_snapshots" add constraint "electoral_roll_snapshots_source_roll_id_foreign" foreign key ("source_roll_id") references "electoral_rolls" ("id") on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table "electoral_roll_snapshots" add constraint "electoral_roll_snapshots_commission_id_foreign" foreign key ("commission_id") references "election_commissions" ("id") on update cascade on delete restrict;',
    );
    this.addSql(
      'alter table "electoral_roll_snapshot_members" add constraint "electoral_roll_snapshot_members_snapshot_id_foreign" foreign key ("snapshot_id") references "electoral_roll_snapshots" ("id") on update cascade on delete cascade;',
    );

    this.addSql(
      'alter table "votes" add column "electoral_roll_snapshot_id" uuid null;',
    );
    this.addSql(
      'alter table "votes" add constraint "votes_electoral_roll_snapshot_id_foreign" foreign key ("electoral_roll_snapshot_id") references "electoral_roll_snapshots" ("id") on update cascade on delete restrict;',
    );
    this.addSql(
      'create index "votes_electoral_roll_snapshot_id_index" on "votes" ("electoral_roll_snapshot_id");',
    );

    this.addSql(
      'alter table "electors" add column "snapshot_member_id" uuid null;',
    );
    this.addSql(
      'alter table "electors" add constraint "electors_snapshot_member_id_foreign" foreign key ("snapshot_member_id") references "electoral_roll_snapshot_members" ("id") on update cascade on delete restrict;',
    );
    this.addSql(
      'create unique index "electors_vote_id_snapshot_member_id_unique" on "electors" ("vote_id", "snapshot_member_id") where "snapshot_member_id" is not null;',
    );
  }

  override down(): void {
    this.addSql(
      'drop index if exists "electors_vote_id_snapshot_member_id_unique";',
    );
    this.addSql(
      'alter table "electors" drop constraint if exists "electors_snapshot_member_id_foreign";',
    );
    this.addSql(
      'alter table "electors" drop column if exists "snapshot_member_id";',
    );
    this.addSql(
      'drop index if exists "votes_electoral_roll_snapshot_id_index";',
    );
    this.addSql(
      'alter table "votes" drop constraint if exists "votes_electoral_roll_snapshot_id_foreign";',
    );
    this.addSql(
      'alter table "votes" drop column if exists "electoral_roll_snapshot_id";',
    );
    this.addSql(
      'drop table if exists "electoral_roll_snapshot_members" cascade;',
    );
    this.addSql('drop table if exists "electoral_roll_snapshots" cascade;');
    this.addSql('drop table if exists "electoral_roll_members" cascade;');
    this.addSql('drop table if exists "electoral_rolls" cascade;');
  }
}
