import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260314010000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "crm_task" add column if not exists "start_at" timestamptz null;`)
    this.addSql(`alter table if exists "crm_task" add column if not exists "end_at" timestamptz null;`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "crm_task" drop column if exists "start_at";`)
    this.addSql(`alter table if exists "crm_task" drop column if exists "end_at";`)
  }
}
