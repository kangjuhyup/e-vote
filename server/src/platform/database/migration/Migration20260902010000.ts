import { Migration } from '@mikro-orm/migrations';

export class Migration20260902010000 extends Migration {
  override up(): void {
    this.addSql(
      'alter table "billing_orders" add column "version" integer not null default 1;',
    );
    this.addSql(
      'alter table "billing_orders" add constraint "billing_orders_version_positive" check ("version" > 0);',
    );
    this.addSql(`
      create table "integration_outbox" (
        "id" uuid not null,
        "deduplication_key" varchar(500) not null,
        "source" varchar(100) not null,
        "event_type" varchar(200) not null,
        "schema_version" smallint not null,
        "aggregate_type" varchar(100) not null,
        "aggregate_id" uuid not null,
        "aggregate_version" integer not null,
        "event_position" integer not null default 0,
        "payload" jsonb not null,
        "correlation_id" varchar(255) null,
        "causation_id" varchar(255) null,
        "occurred_at" timestamptz not null,
        "created_at" timestamptz not null default transaction_timestamp(),
        "status" varchar(20) not null default 'PENDING',
        "available_at" timestamptz not null default transaction_timestamp(),
        "claim_count" integer not null default 0,
        "publish_attempt_count" integer not null default 0,
        "locked_by" varchar(255) null,
        "lock_token" uuid null,
        "locked_until" timestamptz null,
        "published_at" timestamptz null,
        "last_error" text null,
        constraint "integration_outbox_pkey" primary key ("id"),
        constraint "integration_outbox_deduplication_key_unique" unique ("deduplication_key"),
        constraint "integration_outbox_schema_version_positive" check ("schema_version" > 0),
        constraint "integration_outbox_aggregate_version_positive" check ("aggregate_version" > 0),
        constraint "integration_outbox_event_position_non_negative" check ("event_position" >= 0),
        constraint "integration_outbox_claim_count_non_negative" check ("claim_count" >= 0),
        constraint "integration_outbox_publish_attempt_count_non_negative" check ("publish_attempt_count" >= 0),
        constraint "integration_outbox_status_valid" check ("status" in ('PENDING', 'PROCESSING', 'PUBLISHED', 'DEAD'))
      );
    `);
    this.addSql(
      'create unique index "integration_outbox_transition_unique" on "integration_outbox" ("source", "aggregate_type", "aggregate_id", "aggregate_version", "event_type", "event_position");',
    );
    this.addSql(
      'create index "integration_outbox_pending_due" on "integration_outbox" ("available_at", "created_at", "id") where "status" = \'PENDING\';',
    );
    this.addSql(
      'create index "integration_outbox_processing_lease" on "integration_outbox" ("locked_until", "id") where "status" = \'PROCESSING\';',
    );
    this.addSql(
      'create index "integration_outbox_aggregate_order" on "integration_outbox" ("aggregate_type", "aggregate_id", "aggregate_version", "event_position", "id") where "status" in (\'PENDING\', \'PROCESSING\', \'DEAD\');',
    );
    this.addSql(
      'create index "integration_outbox_published_retention" on "integration_outbox" ("published_at", "id") where "status" = \'PUBLISHED\';',
    );
  }

  override down(): void {
    this.addSql('drop table if exists "integration_outbox" cascade;');
    this.addSql(
      'alter table "billing_orders" drop constraint if exists "billing_orders_version_positive";',
    );
    this.addSql(
      'alter table "billing_orders" drop column if exists "version";',
    );
  }
}
