import { Migration } from '@mikro-orm/migrations';

export class Migration20260813020000 extends Migration {
  override up(): void {
    this.addSql(`
      create table "vote_detail_attachments" (
        "id" uuid not null,
        "vote_detail_id" uuid not null,
        "file_id" uuid not null,
        "type" varchar(255) not null,
        "sort_order" int not null,
        "created_at" timestamptz not null,
        constraint "vote_detail_attachments_pkey" primary key ("id"),
        constraint "vote_detail_attachments_vote_detail_id_file_id_unique" unique ("vote_detail_id", "file_id"),
        constraint "vote_detail_attachments_type_check" check ("type" in ('NOTICE', 'GUIDE', 'ETC'))
      );
    `);

    this.addSql(
      'create index "vote_detail_attachments_vote_detail_id_index" on "vote_detail_attachments" ("vote_detail_id");',
    );
    this.addSql(
      'create index "vote_detail_attachments_file_id_index" on "vote_detail_attachments" ("file_id");',
    );
    this.addSql(
      'alter table "vote_detail_attachments" add constraint "vote_detail_attachments_vote_detail_id_foreign" foreign key ("vote_detail_id") references "vote_details" ("id") on update cascade on delete cascade;',
    );
    this.addSql(
      'alter table "vote_detail_attachments" add constraint "vote_detail_attachments_file_id_foreign" foreign key ("file_id") references "files" ("id") on update cascade on delete cascade;',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "vote_detail_attachments" cascade;');
  }
}
