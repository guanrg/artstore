import { model } from "@medusajs/framework/utils"
import Task from "./task"

const TaskRelation = model.define(
  {
    name: "task_relation",
    tableName: "crm_task_relation",
  },
  {
    id: model.id({ prefix: "trl" }).primaryKey(),
    target_type: model.text(),
    target_id: model.text(),
    relationship: model.text().default("related"),
    task: model.belongsTo(() => Task, {
      mappedBy: "relations",
    }),
  }
)

export default TaskRelation
