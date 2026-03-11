import { model } from "@medusajs/framework/utils"
import TaskRelation from "./task-relation"

export enum TaskType {
  TODO = "todo",
  CALL = "call",
  EMAIL = "email",
  MEETING = "meeting",
  FOLLOW_UP = "follow_up",
}

export enum TaskStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELED = "canceled",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

const Task = model.define(
  {
    name: "task",
    tableName: "crm_task",
  },
  {
    id: model.id({ prefix: "task" }).primaryKey(),
    title: model.text(),
    description: model.text().nullable(),
    type: model.enum(TaskType).default(TaskType.TODO),
    status: model.enum(TaskStatus).default(TaskStatus.OPEN),
    priority: model.enum(TaskPriority).default(TaskPriority.MEDIUM),
    due_date: model.dateTime().nullable(),
    completed_at: model.dateTime().nullable(),
    owner_id: model.text().nullable(),
    customer_id: model.text().nullable(),
    relations: model.hasMany(() => TaskRelation, {
      mappedBy: "task",
    }),
  }
)

export default Task
