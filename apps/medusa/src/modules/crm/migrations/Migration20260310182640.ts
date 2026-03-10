import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260310182640 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "crm_lead" ("id" text not null, "name" text not null, "email" text not null, "company" text not null, "source" text not null, "status" text check ("status" in ('new', 'contacted', 'qualified', 'lost')) not null default 'new', "customer_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "crm_lead_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_lead_deleted_at" ON "crm_lead" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "crm_opportunity" ("id" text not null, "name" text not null, "estimated_amount" numeric not null, "customer_id" text not null, "stage" text check ("stage" in ('prospecting', 'negotiation', 'closed_won', 'closed_lost')) not null default 'prospecting', "expected_close_date" timestamptz null, "lead_id" text null, "raw_estimated_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "crm_opportunity_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_opportunity_lead_id" ON "crm_opportunity" ("lead_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_crm_opportunity_deleted_at" ON "crm_opportunity" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "crm_opportunity" add constraint "crm_opportunity_lead_id_foreign" foreign key ("lead_id") references "crm_lead" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "crm_opportunity" drop constraint if exists "crm_opportunity_lead_id_foreign";`);

    this.addSql(`drop table if exists "crm_lead" cascade;`);

    this.addSql(`drop table if exists "crm_opportunity" cascade;`);
  }

}
