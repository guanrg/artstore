import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260310185716 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "crm_task" ("id" text not null, "title" text not null, "description" text null, "type" text check ("type" in ('todo', 'call', 'email', 'meeting', 'follow_up')) not null default 'todo', "status" text check ("status" in ('open', 'in_progress', 'completed', 'canceled')) not null default 'open', "priority" text check ("priority" in ('low', 'medium', 'high', 'urgent')) not null default 'medium', "due_date" timestamptz null, "completed_at" timestamptz null, "owner_id" text null, "customer_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "crm_task_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_task_deleted_at" ON "crm_task" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "crm_task_relation" ("id" text not null, "target_type" text not null, "target_id" text not null, "relationship" text not null default 'related', "task_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "crm_task_relation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_task_relation_task_id" ON "crm_task_relation" ("task_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_task_relation_deleted_at" ON "crm_task_relation" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "crm_task_relation" add constraint "crm_task_relation_task_id_foreign" foreign key ("task_id") references "crm_task" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "crm_task_relation" drop constraint if exists "crm_task_relation_task_id_foreign";`);

    this.addSql(`drop table if exists "crm_task" cascade;`);

    this.addSql(`drop table if exists "crm_task_relation" cascade;`);
  }

}
