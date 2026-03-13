import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState, type CSSProperties, type FocusEvent, type KeyboardEvent } from "react"
import AdminLanguageDock from "../../components/admin-language-dock"
import { useAdminLanguage } from "../../lib/admin-language"
import { adminCardStyle, adminTheme } from "../../lib/admin-theme"
import ReportHeader from "../reports/components/report-header"

type Lead = {
  id: string
  name: string
  email: string
  company: string
  source: string
  status: "new" | "contacted" | "qualified" | "lost"
  customer_id?: string | null
}

type Opportunity = {
  id: string
  name: string
  estimated_amount: number | string
  customer_id: string
  stage: "prospecting" | "negotiation" | "closed_won" | "closed_lost"
  expected_close_date?: string | null
  lead_id?: string | null
}

type Task = {
  id: string
  title: string
  description?: string | null
  type: "todo" | "call" | "email" | "meeting" | "follow_up"
  status: "open" | "in_progress" | "completed" | "canceled"
  priority: "low" | "medium" | "high" | "urgent"
  due_date?: string | null
  completed_at?: string | null
  owner_id?: string | null
  customer_id?: string | null
}

type TaskRelation = {
  id: string
  task_id: string
  target_type: string
  target_id: string
  relationship: string
}

type CrmTab = "lead" | "opportunity" | "task"
type LeadStatusFilter = "" | Lead["status"]
type OpportunityStageFilter = "" | Opportunity["stage"]
type TaskStatusFilter = "" | Task["status"]

async function api<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: unknown
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`)
  }

  return data
}

function badgeStyle(color: string): CSSProperties {
  return {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    color,
    background: `${color}1A`,
    border: `1px solid ${color}55`,
    borderRadius: 999,
    padding: "4px 9px",
  }
}

const shellStyle: CSSProperties = {
  padding: 16,
  display: "grid",
  gap: 16,
  background: `radial-gradient(circle at top left, ${adminTheme.color.highlight} 0%, transparent 22%), linear-gradient(180deg, ${adminTheme.color.canvas} 0%, ${adminTheme.color.canvasAlt} 100%)`,
}

const topCardStyle: CSSProperties = {
  ...adminCardStyle,
  background: `linear-gradient(135deg, ${adminTheme.color.surfaceMuted} 0%, ${adminTheme.color.primarySoft} 58%, ${adminTheme.color.surface} 100%)`,
  borderRadius: 18,
  padding: 14,
}

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 14,
  alignItems: "start",
}

const panelStyle: CSSProperties = {
  ...adminCardStyle,
  borderRadius: 16,
  padding: 14,
}

const listItemBase: CSSProperties = {
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: 12,
  padding: 10,
  cursor: "pointer",
  background: adminTheme.color.surface,
  transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
}

const inputStyle: CSSProperties = {
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: 10,
  padding: "7px 10px",
  fontSize: 13,
  background: adminTheme.color.surface,
  color: adminTheme.color.text,
  boxShadow: adminTheme.shadow.soft,
  width: "100%",
}

const buttonStyle: CSSProperties = {
  border: `1px solid ${adminTheme.color.border}`,
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
  background: adminTheme.color.surface,
  color: adminTheme.color.text,
  boxShadow: adminTheme.shadow.soft,
}

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  border: `1px solid ${adminTheme.color.primary}`,
  background: adminTheme.color.primary,
  color: adminTheme.color.primaryText,
}

const sectionDividerStyle: CSSProperties = {
  borderTop: `1px solid ${adminTheme.color.border}`,
  paddingTop: 12,
}

const helperTextStyle: CSSProperties = {
  color: adminTheme.color.textMuted,
  fontSize: 12,
}

const selectedListItemStyle: CSSProperties = {
  borderColor: adminTheme.color.primary,
  background: `linear-gradient(180deg, ${adminTheme.color.primarySoft} 0%, ${adminTheme.color.surface} 100%)`,
  boxShadow: adminTheme.shadow.focus,
}

const sectionHeadingStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
}

const sectionTitleTextStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: adminTheme.color.text,
}

const formGridThreeStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
}

const formGridFourStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
}

const listWrapStyle: CSSProperties = {
  marginTop: 12,
  display: "grid",
  gap: 8,
  maxHeight: 620,
  overflow: "auto",
  paddingRight: 2,
}

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
}

const microCardStyle: CSSProperties = {
  ...listItemBase,
  padding: "8px 10px",
}

function interactiveListItemHandlers(
  onSelect: () => void,
  selected: boolean
) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onSelect,
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onSelect()
      }
    },
    onFocus: (event: FocusEvent<HTMLDivElement>) => {
      event.currentTarget.style.transform = "translateY(-1px)"
      event.currentTarget.style.boxShadow = adminTheme.shadow.focus
      event.currentTarget.style.borderColor = adminTheme.color.primary
    },
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      event.currentTarget.style.transform = ""
      event.currentTarget.style.boxShadow = selected ? adminTheme.shadow.focus : "none"
      event.currentTarget.style.borderColor = selected ? adminTheme.color.primary : adminTheme.color.border
    },
  }
}

function ObjectMark(props: { label: string; tone?: "primary" | "success" | "accent" | "info" }) {
  const tone = props.tone ?? "primary"
  const map = {
    primary: { bg: adminTheme.color.primarySoft, fg: adminTheme.color.primary },
    success: { bg: adminTheme.color.successSoft, fg: adminTheme.color.success },
    accent: { bg: adminTheme.color.accentSoft, fg: adminTheme.color.accent },
    info: { bg: adminTheme.color.infoSoft, fg: adminTheme.color.info },
  }[tone]

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 28,
        height: 28,
        padding: "0 8px",
        borderRadius: 999,
        background: map.bg,
        color: map.fg,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.04em",
      }}
    >
      {props.label}
    </span>
  )
}

const CrmPage = () => {
  const { t } = useAdminLanguage()
  const [tab, setTab] = useState<CrmTab>("lead")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const [leads, setLeads] = useState<Lead[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  const [selectedLeadId, setSelectedLeadId] = useState("")
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("")
  const [selectedTaskId, setSelectedTaskId] = useState("")

  const [leadSearch, setLeadSearch] = useState("")
  const [opportunitySearch, setOpportunitySearch] = useState("")
  const [taskSearch, setTaskSearch] = useState("")
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatusFilter>("")
  const [opportunityStageFilter, setOpportunityStageFilter] =
    useState<OpportunityStageFilter>("")
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>("")
  const [urlReady, setUrlReady] = useState(false)

  const [relatedTasks, setRelatedTasks] = useState<Task[]>([])
  const [taskRelations, setTaskRelations] = useState<TaskRelation[]>([])

  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    company: "",
    source: "",
    status: "new" as Lead["status"],
    customer_id: "",
  })

  const [convertForm, setConvertForm] = useState({
    name: "",
    estimated_amount: "",
    customer_id: "",
    stage: "prospecting" as Opportunity["stage"],
    expected_close_date: "",
  })

  const [opportunityForm, setOpportunityForm] = useState({
    name: "",
    estimated_amount: "",
    customer_id: "",
    stage: "prospecting" as Opportunity["stage"],
    expected_close_date: "",
    lead_id: "",
  })

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    type: "todo" as Task["type"],
    status: "open" as Task["status"],
    priority: "medium" as Task["priority"],
    due_date: "",
    completed_at: "",
    owner_id: "",
    customer_id: "",
  })

  const [taskRelationForm, setTaskRelationForm] = useState({
    target_type: "lead",
    target_id: "",
    relationship: "related",
  })

  const selectedLead = useMemo(
    () => leads.find((v) => v.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  )
  const selectedOpportunity = useMemo(
    () => opportunities.find((v) => v.id === selectedOpportunityId) ?? null,
    [opportunities, selectedOpportunityId]
  )
  const selectedTask = useMemo(
    () => tasks.find((v) => v.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  )

  const leadStatusLabel = (status: Lead["status"]) =>
    t(
      {
        new: "新线索",
        contacted: "已联系",
        qualified: "已确认",
        lost: "已丢失",
      }[status],
      {
        new: "new",
        contacted: "contacted",
        qualified: "qualified",
        lost: "lost",
      }[status]
    )

  const opportunityStageLabel = (stage: Opportunity["stage"]) =>
    t(
      {
        prospecting: "挖掘中",
        negotiation: "谈判中",
        closed_won: "赢单",
        closed_lost: "输单",
      }[stage],
      {
        prospecting: "prospecting",
        negotiation: "negotiation",
        closed_won: "closed_won",
        closed_lost: "closed_lost",
      }[stage]
    )

  const taskStatusLabel = (status: Task["status"]) =>
    t(
      {
        open: "待处理",
        in_progress: "进行中",
        completed: "已完成",
        canceled: "已取消",
      }[status],
      {
        open: "open",
        in_progress: "in_progress",
        completed: "completed",
        canceled: "canceled",
      }[status]
    )

  const taskPriorityLabel = (priority: Task["priority"]) =>
    t(
      {
        low: "低",
        medium: "中",
        high: "高",
        urgent: "紧急",
      }[priority],
      {
        low: "low",
        medium: "medium",
        high: "high",
        urgent: "urgent",
      }[priority]
    )

  const taskTypeLabel = (type: Task["type"]) =>
    t(
      {
        todo: "待办",
        call: "电话",
        email: "邮件",
        meeting: "会议",
        follow_up: "跟进",
      }[type],
      {
        todo: "todo",
        call: "call",
        email: "email",
        meeting: "meeting",
        follow_up: "follow_up",
      }[type]
    )

  const filteredLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase()
    return leads.filter(
      (v) =>
        (!leadStatusFilter || v.status === leadStatusFilter) &&
        (!q ||
          v.name.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.company.toLowerCase().includes(q))
    )
  }, [leads, leadSearch, leadStatusFilter])

  const filteredOpportunities = useMemo(() => {
    const q = opportunitySearch.trim().toLowerCase()
    return opportunities.filter(
      (v) =>
        (!opportunityStageFilter || v.stage === opportunityStageFilter) &&
        (!q || v.name.toLowerCase().includes(q) || v.customer_id.toLowerCase().includes(q))
    )
  }, [opportunities, opportunitySearch, opportunityStageFilter])

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase()
    return tasks.filter(
      (v) =>
        (!taskStatusFilter || v.status === taskStatusFilter) &&
        (!q ||
          v.title.toLowerCase().includes(q) ||
          (v.description || "").toLowerCase().includes(q))
    )
  }, [tasks, taskSearch, taskStatusFilter])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextTab = params.get("tab")
    const nextLeadStatus = params.get("lead_status")
    const nextOpportunityStage = params.get("opportunity_stage")
    const nextTaskStatus = params.get("task_status")
    const nextSearch = params.get("q") || ""

    if (nextTab === "lead" || nextTab === "opportunity" || nextTab === "task") {
      setTab(nextTab)
    }

    if (
      nextLeadStatus === "new" ||
      nextLeadStatus === "contacted" ||
      nextLeadStatus === "qualified" ||
      nextLeadStatus === "lost"
    ) {
      setLeadStatusFilter(nextLeadStatus)
    }

    if (
      nextOpportunityStage === "prospecting" ||
      nextOpportunityStage === "negotiation" ||
      nextOpportunityStage === "closed_won" ||
      nextOpportunityStage === "closed_lost"
    ) {
      setOpportunityStageFilter(nextOpportunityStage)
    }

    if (
      nextTaskStatus === "open" ||
      nextTaskStatus === "in_progress" ||
      nextTaskStatus === "completed" ||
      nextTaskStatus === "canceled"
    ) {
      setTaskStatusFilter(nextTaskStatus)
    }

    if (nextTab === "lead") {
      setLeadSearch(nextSearch)
    } else if (nextTab === "opportunity") {
      setOpportunitySearch(nextSearch)
    } else if (nextTab === "task") {
      setTaskSearch(nextSearch)
    }

    setUrlReady(true)
  }, [])

  useEffect(() => {
    if (!urlReady) {
      return
    }

    const params = new URLSearchParams()
    params.set("tab", tab)

    if (tab === "lead") {
      if (leadStatusFilter) params.set("lead_status", leadStatusFilter)
      if (leadSearch.trim()) params.set("q", leadSearch.trim())
    }

    if (tab === "opportunity") {
      if (opportunityStageFilter) params.set("opportunity_stage", opportunityStageFilter)
      if (opportunitySearch.trim()) params.set("q", opportunitySearch.trim())
    }

    if (tab === "task") {
      if (taskStatusFilter) params.set("task_status", taskStatusFilter)
      if (taskSearch.trim()) params.set("q", taskSearch.trim())
    }

    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`)
  }, [
    urlReady,
    tab,
    leadStatusFilter,
    opportunityStageFilter,
    taskStatusFilter,
    leadSearch,
    opportunitySearch,
    taskSearch,
  ])

  const setMessage = (ok: string, err = "") => {
    setNotice(ok)
    setError(err)
  }

  const loadLeads = async () => {
    const data = await api<{ leads: Lead[] }>("/admin/crm/leads?limit=200&offset=0")
    setLeads(data.leads || [])
  }

  const loadOpportunities = async () => {
    const data = await api<{ opportunities: Opportunity[] }>(
      "/admin/crm/opportunities?limit=200&offset=0"
    )
    setOpportunities(data.opportunities || [])
  }

  const loadTasks = async () => {
    const data = await api<{ tasks: Task[] }>("/admin/crm/tasks?limit=200&offset=0")
    setTasks(data.tasks || [])
  }

  const loadRelatedTasks = async (targetType: string, targetId: string) => {
    if (!targetId) {
      setRelatedTasks([])
      return
    }
    const data = await api<{ tasks: Task[] }>(
      `/admin/crm/tasks?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(
        targetId
      )}&limit=200&offset=0`
    )
    setRelatedTasks(data.tasks || [])
  }

  const loadTaskRelations = async (taskId: string) => {
    if (!taskId) {
      setTaskRelations([])
      return
    }
    const data = await api<{ relations: TaskRelation[] }>(`/admin/crm/tasks/${taskId}/relations`)
    setTaskRelations(data.relations || [])
  }

  useEffect(() => {
    setNotice("")
    setError("")
    setLoading(true)
    ;(async () => {
      try {
        if (tab === "lead") {
          await loadLeads()
        } else if (tab === "opportunity") {
          await loadOpportunities()
        } else {
          await loadTasks()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("加载失败", "Load failed"))
      } finally {
        setLoading(false)
      }
    })()
  }, [tab])

  useEffect(() => {
    if (selectedLead) {
      setLeadForm({
        name: selectedLead.name || "",
        email: selectedLead.email || "",
        company: selectedLead.company || "",
        source: selectedLead.source || "",
        status: selectedLead.status,
        customer_id: selectedLead.customer_id || "",
      })
      void loadRelatedTasks("lead", selectedLead.id)
    } else {
      setLeadForm({
        name: "",
        email: "",
        company: "",
        source: "",
        status: "new",
        customer_id: "",
      })
      setRelatedTasks([])
    }
  }, [selectedLeadId, selectedLead])

  useEffect(() => {
    if (selectedOpportunity) {
      setOpportunityForm({
        name: selectedOpportunity.name || "",
        estimated_amount: String(selectedOpportunity.estimated_amount || ""),
        customer_id: selectedOpportunity.customer_id || "",
        stage: selectedOpportunity.stage,
        expected_close_date: selectedOpportunity.expected_close_date || "",
        lead_id: selectedOpportunity.lead_id || "",
      })
      void loadRelatedTasks("opportunity", selectedOpportunity.id)
    } else {
      setOpportunityForm({
        name: "",
        estimated_amount: "",
        customer_id: "",
        stage: "prospecting",
        expected_close_date: "",
        lead_id: "",
      })
      setRelatedTasks([])
    }
  }, [selectedOpportunityId, selectedOpportunity])

  useEffect(() => {
    if (selectedTask) {
      setTaskForm({
        title: selectedTask.title || "",
        description: selectedTask.description || "",
        type: selectedTask.type,
        status: selectedTask.status,
        priority: selectedTask.priority,
        due_date: selectedTask.due_date || "",
        completed_at: selectedTask.completed_at || "",
        owner_id: selectedTask.owner_id || "",
        customer_id: selectedTask.customer_id || "",
      })
      void loadTaskRelations(selectedTask.id)
    } else {
      setTaskForm({
        title: "",
        description: "",
        type: "todo",
        status: "open",
        priority: "medium",
        due_date: "",
        completed_at: "",
        owner_id: "",
        customer_id: "",
      })
      setTaskRelations([])
    }
  }, [selectedTaskId, selectedTask])

  const saveLead = async () => {
    try {
      setLoading(true)
      setError("")
      if (!leadForm.name || !leadForm.email || !leadForm.company || !leadForm.source) {
        throw new Error(t("线索必填项：姓名 / 邮箱 / 公司 / 来源", "Lead required fields: name/email/company/source"))
      }

      if (selectedLeadId) {
        await api(`/admin/crm/leads/${selectedLeadId}`, "PATCH", {
          ...leadForm,
          customer_id: leadForm.customer_id || null,
        })
        setMessage(t("线索已更新", "Lead updated"))
      } else {
        await api(`/admin/crm/leads`, "POST", {
          ...leadForm,
          customer_id: leadForm.customer_id || undefined,
        })
        setMessage(t("线索已创建", "Lead created"))
      }

      await loadLeads()
      if (!selectedLeadId) {
        setLeadSearch("")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("保存失败", "Save failed"))
    } finally {
      setLoading(false)
    }
  }

  const deleteLead = async (id: string) => {
    if (!window.confirm(t(`确认删除线索 ${id}？`, `Delete lead ${id}?`))) return
    try {
      setLoading(true)
      await api(`/admin/crm/leads/${id}`, "DELETE")
      setMessage(t("线索已删除", "Lead deleted"))
      if (selectedLeadId === id) {
        setSelectedLeadId("")
      }
      await loadLeads()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("删除失败", "Delete failed"))
    } finally {
      setLoading(false)
    }
  }

  const convertLead = async () => {
    if (!selectedLeadId) {
      setError(t("请先选择一条线索", "Select a lead first"))
      return
    }

    try {
      setLoading(true)
      await api(`/admin/crm/leads/${selectedLeadId}/convert`, "POST", {
        name: convertForm.name,
        estimated_amount: convertForm.estimated_amount,
        customer_id: convertForm.customer_id || selectedLead?.customer_id || undefined,
        stage: convertForm.stage,
        expected_close_date: convertForm.expected_close_date || undefined,
      })
      setMessage(t("线索已转换为商机", "Lead converted to opportunity"))
      await Promise.all([loadLeads(), loadOpportunities()])
      setTab("opportunity")
      setSelectedLeadId("")
      setConvertForm({
        name: "",
        estimated_amount: "",
        customer_id: "",
        stage: "prospecting",
        expected_close_date: "",
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t("转换失败", "Convert failed"))
    } finally {
      setLoading(false)
    }
  }

  const saveOpportunity = async () => {
    try {
      setLoading(true)
      if (!opportunityForm.name || !opportunityForm.customer_id) {
        throw new Error(
          t("商机必填项：名称 / 客户 ID", "Opportunity required fields: name/customer_id")
        )
      }

      if (selectedOpportunityId) {
        await api(`/admin/crm/opportunities/${selectedOpportunityId}`, "PATCH", {
          ...opportunityForm,
          expected_close_date: opportunityForm.expected_close_date || null,
          lead_id: opportunityForm.lead_id || null,
        })
        setMessage(t("商机已更新", "Opportunity updated"))
      } else {
        await api(`/admin/crm/opportunities`, "POST", {
          ...opportunityForm,
          expected_close_date: opportunityForm.expected_close_date || undefined,
          lead_id: opportunityForm.lead_id || undefined,
        })
        setMessage(t("商机已创建", "Opportunity created"))
      }

      await loadOpportunities()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("保存失败", "Save failed"))
    } finally {
      setLoading(false)
    }
  }

  const deleteOpportunity = async (id: string) => {
    if (!window.confirm(t(`确认删除商机 ${id}？`, `Delete opportunity ${id}?`))) return
    try {
      setLoading(true)
      await api(`/admin/crm/opportunities/${id}`, "DELETE")
      setMessage(t("商机已删除", "Opportunity deleted"))
      if (selectedOpportunityId === id) {
        setSelectedOpportunityId("")
      }
      await loadOpportunities()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("删除失败", "Delete failed"))
    } finally {
      setLoading(false)
    }
  }

  const saveTask = async () => {
    try {
      setLoading(true)
      if (!taskForm.title) {
        throw new Error(t("任务必填项：标题", "Task required field: title"))
      }

      if (selectedTaskId) {
        await api(`/admin/crm/tasks/${selectedTaskId}`, "PATCH", {
          ...taskForm,
          description: taskForm.description || null,
          due_date: taskForm.due_date || null,
          completed_at: taskForm.completed_at || null,
          owner_id: taskForm.owner_id || null,
          customer_id: taskForm.customer_id || null,
        })
        setMessage(t("任务已更新", "Task updated"))
      } else {
        await api(`/admin/crm/tasks`, "POST", {
          ...taskForm,
          description: taskForm.description || undefined,
          due_date: taskForm.due_date || undefined,
          completed_at: taskForm.completed_at || undefined,
          owner_id: taskForm.owner_id || undefined,
          customer_id: taskForm.customer_id || undefined,
        })
        setMessage(t("任务已创建", "Task created"))
      }

      await loadTasks()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("保存失败", "Save failed"))
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async (id: string) => {
    if (!window.confirm(t(`确认删除任务 ${id}？`, `Delete task ${id}?`))) return
    try {
      setLoading(true)
      await api(`/admin/crm/tasks/${id}`, "DELETE")
      setMessage(t("任务已删除", "Task deleted"))
      if (selectedTaskId === id) {
        setSelectedTaskId("")
      }
      await loadTasks()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("删除失败", "Delete failed"))
    } finally {
      setLoading(false)
    }
  }

  const addTaskRelation = async () => {
    if (!selectedTaskId) {
      setError(t("请先选择一个任务", "Select a task first"))
      return
    }
    if (!taskRelationForm.target_type || !taskRelationForm.target_id) {
      setError(t("关联必填：关联类型 + 关联目标 ID", "Relation required: target type + target ID"))
      return
    }

    try {
      setLoading(true)
      await api(`/admin/crm/tasks/${selectedTaskId}/relations`, "POST", {
        relations: [
          {
            target_type: taskRelationForm.target_type,
            target_id: taskRelationForm.target_id,
            relationship: taskRelationForm.relationship || "related",
          },
        ],
      })
      setMessage(t("任务关联已添加", "Task relation added"))
      await loadTaskRelations(selectedTaskId)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("添加关联失败", "Add relation failed"))
    } finally {
      setLoading(false)
    }
  }

  const removeTaskRelation = async (relationId: string) => {
    if (!selectedTaskId) return
    try {
      setLoading(true)
      await api(`/admin/crm/tasks/${selectedTaskId}/relations`, "DELETE", {
        relation_ids: [relationId],
      })
      setMessage(t("任务关联已移除", "Task relation removed"))
      await loadTaskRelations(selectedTaskId)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("删除关联失败", "Delete relation failed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={shellStyle}>
      <div style={topCardStyle}>
        <ReportHeader
          title={t("CRM 工作台", "CRM Workspace")}
          crumbs={[
            { label: t("CRM", "CRM") },
          ]}
          aside={
            <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span style={badgeStyle(adminTheme.color.primary)}>{t("线索", "Leads")} {leads.length}</span>
                <span style={badgeStyle(adminTheme.color.success)}>{t("商机", "Opps")} {opportunities.length}</span>
                <span style={badgeStyle(adminTheme.color.accent)}>{t("任务", "Tasks")} {tasks.length}</span>
              </div>
            </div>
          }
        />
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            type="button"
            style={tab === "lead" ? primaryButtonStyle : buttonStyle}
            onClick={() => setTab("lead")}
          >
            {t("线索", "Leads")}
          </button>
          <button
            type="button"
            style={tab === "opportunity" ? primaryButtonStyle : buttonStyle}
            onClick={() => setTab("opportunity")}
          >
            {t("商机", "Opportunities")}
          </button>
          <button
            type="button"
            style={tab === "task" ? primaryButtonStyle : buttonStyle}
            onClick={() => setTab("task")}
          >
            {t("任务", "Tasks")}
          </button>
        </div>
        {loading ? <p style={{ margin: "10px 0 0", color: adminTheme.color.textMuted }}>{t("加载中...", "Loading...")}</p> : null}
        {error ? <p style={{ margin: "10px 0 0", color: adminTheme.color.danger }}>{error}</p> : null}
        {notice ? <p style={{ margin: "10px 0 0", color: adminTheme.color.success }}>{notice}</p> : null}
      </div>

      <div style={layoutStyle}>
        <div style={panelStyle}>
          {tab === "lead" ? (
            <>
              <div style={sectionHeadingStyle}>
                <div style={{ display: "grid", gap: 2 }}>
                  <strong style={sectionTitleTextStyle}>{t("线索列表", "Lead List")}</strong>
                  <span style={helperTextStyle}>{t("筛选并选择要编辑的线索对象。", "Filter and choose the lead you want to edit.")}</span>
                </div>
                <button type="button" style={buttonStyle} onClick={() => setSelectedLeadId("")}>
                  {t("新建", "New")}
                </button>
              </div>
              <input
                style={inputStyle}
                placeholder={t("搜索线索", "Search lead")}
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
              />
              <select
                style={{ ...inputStyle, marginTop: 8 }}
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value as LeadStatusFilter)}
              >
                <option value="">{t("全部状态", "All statuses")}</option>
                <option value="new">{leadStatusLabel("new")}</option>
                <option value="contacted">{leadStatusLabel("contacted")}</option>
                <option value="qualified">{leadStatusLabel("qualified")}</option>
                <option value="lost">{leadStatusLabel("lost")}</option>
              </select>
              <div style={listWrapStyle}>
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      ...listItemBase,
                      ...(selectedLeadId === lead.id ? selectedListItemStyle : null),
                    }}
                    {...interactiveListItemHandlers(() => setSelectedLeadId(lead.id), selectedLeadId === lead.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ fontWeight: 700, color: adminTheme.color.text }}>{lead.name}</div>
                      <ObjectMark label="LD" tone="primary" />
                    </div>
                    <div style={{ fontSize: 12, color: adminTheme.color.textMuted }}>{lead.email}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <span style={badgeStyle(adminTheme.color.info)}>{leadStatusLabel(lead.status)}</span>
                      <span style={badgeStyle(adminTheme.color.primary)}>{lead.company}</span>
                    </div>
                  </div>
                ))}
                {!filteredLeads.length ? (
                  <div style={{ ...microCardStyle, textAlign: "center", color: adminTheme.color.textMuted }}>
                    {t("当前筛选下没有线索。", "No leads match the current filters.")}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {tab === "opportunity" ? (
            <>
              <div style={sectionHeadingStyle}>
                <div style={{ display: "grid", gap: 2 }}>
                  <strong style={sectionTitleTextStyle}>{t("商机列表", "Opportunity List")}</strong>
                  <span style={helperTextStyle}>{t("聚焦当前推进中的商机和阶段变化。", "Focus on active opportunities and stage movement.")}</span>
                </div>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => setSelectedOpportunityId("")}
                >
                  {t("新建", "New")}
                </button>
              </div>
              <input
                style={inputStyle}
                placeholder={t("搜索商机", "Search opportunity")}
                value={opportunitySearch}
                onChange={(e) => setOpportunitySearch(e.target.value)}
              />
              <select
                style={{ ...inputStyle, marginTop: 8 }}
                value={opportunityStageFilter}
                onChange={(e) =>
                  setOpportunityStageFilter(e.target.value as OpportunityStageFilter)
                }
              >
                <option value="">{t("全部阶段", "All stages")}</option>
                <option value="prospecting">{opportunityStageLabel("prospecting")}</option>
                <option value="negotiation">{opportunityStageLabel("negotiation")}</option>
                <option value="closed_won">{opportunityStageLabel("closed_won")}</option>
                <option value="closed_lost">{opportunityStageLabel("closed_lost")}</option>
              </select>
              <div style={listWrapStyle}>
                {filteredOpportunities.map((op) => (
                  <div
                    key={op.id}
                    style={{
                      ...listItemBase,
                      ...(selectedOpportunityId === op.id ? selectedListItemStyle : null),
                    }}
                    {...interactiveListItemHandlers(() => setSelectedOpportunityId(op.id), selectedOpportunityId === op.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ fontWeight: 700, color: adminTheme.color.text }}>{op.name}</div>
                      <ObjectMark label="OP" tone="success" />
                    </div>
                    <div style={{ fontSize: 12, color: adminTheme.color.textMuted }}>{op.customer_id}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <span style={badgeStyle(adminTheme.color.info)}>{opportunityStageLabel(op.stage)}</span>
                      <span style={badgeStyle(adminTheme.color.success)}>{String(op.estimated_amount)}</span>
                    </div>
                  </div>
                ))}
                {!filteredOpportunities.length ? (
                  <div style={{ ...microCardStyle, textAlign: "center", color: adminTheme.color.textMuted }}>
                    {t("当前筛选下没有商机。", "No opportunities match the current filters.")}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {tab === "task" ? (
            <>
              <div style={sectionHeadingStyle}>
                <div style={{ display: "grid", gap: 2 }}>
                  <strong style={sectionTitleTextStyle}>{t("任务列表", "Task List")}</strong>
                  <span style={helperTextStyle}>{t("查看任务状态、优先级和关联对象。", "Review task status, priority, and linked records.")}</span>
                </div>
                <button type="button" style={buttonStyle} onClick={() => setSelectedTaskId("")}>
                  {t("新建", "New")}
                </button>
              </div>
              <input
                style={inputStyle}
                placeholder={t("搜索任务", "Search task")}
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
              />
              <select
                style={{ ...inputStyle, marginTop: 8 }}
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value as TaskStatusFilter)}
              >
                <option value="">{t("全部状态", "All statuses")}</option>
                <option value="open">{taskStatusLabel("open")}</option>
                <option value="in_progress">{taskStatusLabel("in_progress")}</option>
                <option value="completed">{taskStatusLabel("completed")}</option>
                <option value="canceled">{taskStatusLabel("canceled")}</option>
              </select>
              <div style={listWrapStyle}>
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      ...listItemBase,
                      ...(selectedTaskId === task.id ? selectedListItemStyle : null),
                    }}
                    {...interactiveListItemHandlers(() => setSelectedTaskId(task.id), selectedTaskId === task.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ fontWeight: 700, color: adminTheme.color.text }}>{task.title}</div>
                      <ObjectMark label="TS" tone="accent" />
                    </div>
                    <div style={{ fontSize: 12, color: adminTheme.color.textMuted }}>{task.description || "-"}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <span style={badgeStyle(adminTheme.color.info)}>{taskStatusLabel(task.status)}</span>
                      <span style={badgeStyle(adminTheme.color.accent)}>{taskPriorityLabel(task.priority)}</span>
                      <span style={badgeStyle(adminTheme.color.primary)}>{taskTypeLabel(task.type)}</span>
                    </div>
                  </div>
                ))}
                {!filteredTasks.length ? (
                  <div style={{ ...microCardStyle, textAlign: "center", color: adminTheme.color.textMuted }}>
                    {t("当前筛选下没有任务。", "No tasks match the current filters.")}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <div style={{ ...panelStyle, display: "grid", gap: 12 }}>
          {tab === "lead" ? (
            <>
              <div>
                <h3 style={{ margin: 0, color: adminTheme.color.text }}>{t("线索详情", "Lead Detail")}</h3>
                <p style={{ margin: "6px 0 0", ...helperTextStyle }}>
                  {selectedLead
                    ? t(`正在编辑 ${selectedLead.id}`, `Editing ${selectedLead.id}`)
                    : t("正在创建新线索", "Creating new lead")}
                </p>
              </div>
              <div style={formGridThreeStyle}>
                <input
                  style={inputStyle}
                  placeholder={t("姓名", "Name")}
                  value={leadForm.name}
                  onChange={(e) => setLeadForm((v) => ({ ...v, name: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder={t("邮箱", "Email")}
                  value={leadForm.email}
                  onChange={(e) => setLeadForm((v) => ({ ...v, email: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder={t("公司", "Company")}
                  value={leadForm.company}
                  onChange={(e) => setLeadForm((v) => ({ ...v, company: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder={t("来源", "Source")}
                  value={leadForm.source}
                  onChange={(e) => setLeadForm((v) => ({ ...v, source: e.target.value }))}
                />
                <select
                  style={inputStyle}
                  value={leadForm.status}
                  onChange={(e) =>
                    setLeadForm((v) => ({ ...v, status: e.target.value as Lead["status"] }))
                  }
                >
                  <option value="new">{leadStatusLabel("new")}</option>
                  <option value="contacted">{leadStatusLabel("contacted")}</option>
                  <option value="qualified">{leadStatusLabel("qualified")}</option>
                  <option value="lost">{leadStatusLabel("lost")}</option>
                </select>
                <input
                  style={inputStyle}
                  placeholder={t("客户 ID", "Customer ID")}
                  value={leadForm.customer_id}
                  onChange={(e) => setLeadForm((v) => ({ ...v, customer_id: e.target.value }))}
                />
              </div>
              <div style={actionRowStyle}>
                <button type="button" style={primaryButtonStyle} onClick={() => void saveLead()}>
                  {selectedLead ? t("保存线索", "Save Lead") : t("创建线索", "Create Lead")}
                </button>
                {selectedLead ? (
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => void deleteLead(selectedLead.id)}
                  >
                    {t("删除", "Delete")}
                  </button>
                ) : null}
              </div>

              <div style={{ ...sectionDividerStyle, display: "grid", gap: 8 }}>
                <h4 style={{ margin: 0, color: adminTheme.color.text }}>{t("转换线索", "Convert Lead")}</h4>
                <div style={formGridFourStyle}>
                  <input
                    style={inputStyle}
                    placeholder={t("商机名称", "Opportunity Name")}
                    value={convertForm.name}
                    onChange={(e) => setConvertForm((v) => ({ ...v, name: e.target.value }))}
                  />
                  <input
                    style={inputStyle}
                    placeholder={t("预计金额", "Estimated Amount")}
                    value={convertForm.estimated_amount}
                    onChange={(e) =>
                      setConvertForm((v) => ({ ...v, estimated_amount: e.target.value }))
                    }
                  />
                  <input
                    style={inputStyle}
                    placeholder={t("客户 ID", "Customer ID")}
                    value={convertForm.customer_id}
                    onChange={(e) =>
                      setConvertForm((v) => ({ ...v, customer_id: e.target.value }))
                    }
                  />
                  <select
                    style={inputStyle}
                    value={convertForm.stage}
                    onChange={(e) =>
                      setConvertForm((v) => ({ ...v, stage: e.target.value as Opportunity["stage"] }))
                    }
                  >
                    <option value="prospecting">{opportunityStageLabel("prospecting")}</option>
                    <option value="negotiation">{opportunityStageLabel("negotiation")}</option>
                    <option value="closed_won">{opportunityStageLabel("closed_won")}</option>
                    <option value="closed_lost">{opportunityStageLabel("closed_lost")}</option>
                  </select>
                </div>
                <div style={actionRowStyle}>
                  <input
                    style={{ ...inputStyle, maxWidth: 280 }}
                    placeholder={t("预计成交日期", "Expected Close Date")}
                    value={convertForm.expected_close_date}
                    onChange={(e) =>
                      setConvertForm((v) => ({ ...v, expected_close_date: e.target.value }))
                    }
                  />
                  <button type="button" style={primaryButtonStyle} onClick={() => void convertLead()}>
                    {t("转换为商机", "Convert to Opportunity")}
                  </button>
                </div>
              </div>

              <div style={sectionDividerStyle}>
                <h4 style={{ margin: 0, color: adminTheme.color.text }}>{t("关联活动（任务）", "Related Activities (Tasks)")}</h4>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {relatedTasks.map((task) => (
                    <div key={task.id} style={microCardStyle}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{task.title}</div>
                      <div style={helperTextStyle}>
                        {taskStatusLabel(task.status)} · {taskPriorityLabel(task.priority)} · {taskTypeLabel(task.type)}
                      </div>
                    </div>
                  ))}
                  {!relatedTasks.length ? (
                    <div style={helperTextStyle}>{t("暂无关联任务。", "No tasks linked.")}</div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {tab === "opportunity" ? (
            <>
              <div>
                <h3 style={{ margin: 0, color: adminTheme.color.text }}>{t("商机详情", "Opportunity Detail")}</h3>
                <p style={{ margin: "6px 0 0", ...helperTextStyle }}>
                  {selectedOpportunity
                    ? t(`正在编辑 ${selectedOpportunity.id}`, `Editing ${selectedOpportunity.id}`)
                    : t("正在创建新商机", "Creating new opportunity")}
                </p>
              </div>
              <div style={formGridThreeStyle}>
                <input
                  style={inputStyle}
                  placeholder={t("名称", "Name")}
                  value={opportunityForm.name}
                  onChange={(e) => setOpportunityForm((v) => ({ ...v, name: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder={t("预计金额", "Estimated Amount")}
                  value={opportunityForm.estimated_amount}
                  onChange={(e) =>
                    setOpportunityForm((v) => ({ ...v, estimated_amount: e.target.value }))
                  }
                />
                <input
                  style={inputStyle}
                  placeholder={t("客户 ID", "Customer ID")}
                  value={opportunityForm.customer_id}
                  onChange={(e) =>
                    setOpportunityForm((v) => ({ ...v, customer_id: e.target.value }))
                  }
                />
                <select
                  style={inputStyle}
                  value={opportunityForm.stage}
                  onChange={(e) =>
                    setOpportunityForm((v) => ({ ...v, stage: e.target.value as Opportunity["stage"] }))
                  }
                >
                  <option value="prospecting">{opportunityStageLabel("prospecting")}</option>
                  <option value="negotiation">{opportunityStageLabel("negotiation")}</option>
                  <option value="closed_won">{opportunityStageLabel("closed_won")}</option>
                  <option value="closed_lost">{opportunityStageLabel("closed_lost")}</option>
                </select>
                <input
                  style={inputStyle}
                  placeholder={t("预计成交日期", "Expected Close Date")}
                  value={opportunityForm.expected_close_date}
                  onChange={(e) =>
                    setOpportunityForm((v) => ({ ...v, expected_close_date: e.target.value }))
                  }
                />
                <input
                  style={inputStyle}
                  placeholder={t("线索 ID", "Lead ID")}
                  value={opportunityForm.lead_id}
                  onChange={(e) => setOpportunityForm((v) => ({ ...v, lead_id: e.target.value }))}
                />
              </div>
              <div style={actionRowStyle}>
                <button
                  type="button"
                  style={primaryButtonStyle}
                  onClick={() => void saveOpportunity()}
                >
                  {selectedOpportunity
                    ? t("保存商机", "Save Opportunity")
                    : t("创建商机", "Create Opportunity")}
                </button>
                {selectedOpportunity ? (
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => void deleteOpportunity(selectedOpportunity.id)}
                  >
                    {t("删除", "Delete")}
                  </button>
                ) : null}
              </div>

              <div style={sectionDividerStyle}>
                <h4 style={{ margin: 0, color: adminTheme.color.text }}>{t("关联活动（任务）", "Related Activities (Tasks)")}</h4>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {relatedTasks.map((task) => (
                    <div key={task.id} style={microCardStyle}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{task.title}</div>
                      <div style={helperTextStyle}>
                        {taskStatusLabel(task.status)} · {taskPriorityLabel(task.priority)} · {taskTypeLabel(task.type)}
                      </div>
                    </div>
                  ))}
                  {!relatedTasks.length ? (
                    <div style={helperTextStyle}>{t("暂无关联任务。", "No tasks linked.")}</div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {tab === "task" ? (
            <>
              <div>
                <h3 style={{ margin: 0, color: adminTheme.color.text }}>{t("任务详情", "Task Detail")}</h3>
                <p style={{ margin: "6px 0 0", ...helperTextStyle }}>
                  {selectedTask
                    ? t(`正在编辑 ${selectedTask.id}`, `Editing ${selectedTask.id}`)
                    : t("正在创建新任务", "Creating new task")}
                </p>
              </div>
              <div style={formGridThreeStyle}>
                <input
                  style={inputStyle}
                  placeholder={t("标题", "Title")}
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((v) => ({ ...v, title: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder={t("描述", "Description")}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((v) => ({ ...v, description: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder={t("截止日期", "Due Date")}
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm((v) => ({ ...v, due_date: e.target.value }))}
                />
                <select
                  style={inputStyle}
                  value={taskForm.type}
                  onChange={(e) => setTaskForm((v) => ({ ...v, type: e.target.value as Task["type"] }))}
                >
                  <option value="todo">{taskTypeLabel("todo")}</option>
                  <option value="call">{taskTypeLabel("call")}</option>
                  <option value="email">{taskTypeLabel("email")}</option>
                  <option value="meeting">{taskTypeLabel("meeting")}</option>
                  <option value="follow_up">{taskTypeLabel("follow_up")}</option>
                </select>
                <select
                  style={inputStyle}
                  value={taskForm.status}
                  onChange={(e) =>
                    setTaskForm((v) => ({ ...v, status: e.target.value as Task["status"] }))
                  }
                >
                  <option value="open">{taskStatusLabel("open")}</option>
                  <option value="in_progress">{taskStatusLabel("in_progress")}</option>
                  <option value="completed">{taskStatusLabel("completed")}</option>
                  <option value="canceled">{taskStatusLabel("canceled")}</option>
                </select>
                <select
                  style={inputStyle}
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm((v) => ({ ...v, priority: e.target.value as Task["priority"] }))
                  }
                >
                  <option value="low">{taskPriorityLabel("low")}</option>
                  <option value="medium">{taskPriorityLabel("medium")}</option>
                  <option value="high">{taskPriorityLabel("high")}</option>
                  <option value="urgent">{taskPriorityLabel("urgent")}</option>
                </select>
                <input
                  style={inputStyle}
                  placeholder={t("负责人 ID", "Owner ID")}
                  value={taskForm.owner_id}
                  onChange={(e) => setTaskForm((v) => ({ ...v, owner_id: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder={t("客户 ID", "Customer ID")}
                  value={taskForm.customer_id}
                  onChange={(e) => setTaskForm((v) => ({ ...v, customer_id: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder={t("完成时间", "Completed At")}
                  value={taskForm.completed_at}
                  onChange={(e) =>
                    setTaskForm((v) => ({ ...v, completed_at: e.target.value }))
                  }
                />
              </div>
              <div style={actionRowStyle}>
                <button type="button" style={primaryButtonStyle} onClick={() => void saveTask()}>
                  {selectedTask ? t("保存任务", "Save Task") : t("创建任务", "Create Task")}
                </button>
                {selectedTask ? (
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => void deleteTask(selectedTask.id)}
                  >
                    {t("删除", "Delete")}
                  </button>
                ) : null}
              </div>

              {selectedTask ? (
                <div style={{ ...sectionDividerStyle, display: "grid", gap: 8 }}>
                  <h4 style={{ margin: 0, color: adminTheme.color.text }}>{t("关联对象", "Related To")}</h4>
                  <div style={formGridThreeStyle}>
                    <input
                      style={inputStyle}
                      placeholder={t("关联类型", "Target type")}
                      value={taskRelationForm.target_type}
                      onChange={(e) =>
                        setTaskRelationForm((v) => ({ ...v, target_type: e.target.value }))
                      }
                    />
                    <input
                      style={inputStyle}
                      placeholder={t("关联目标 ID", "Target ID")}
                      value={taskRelationForm.target_id}
                      onChange={(e) =>
                        setTaskRelationForm((v) => ({ ...v, target_id: e.target.value }))
                      }
                    />
                    <input
                      style={inputStyle}
                      placeholder={t("关联关系", "Relationship")}
                      value={taskRelationForm.relationship}
                      onChange={(e) =>
                        setTaskRelationForm((v) => ({ ...v, relationship: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <button type="button" style={buttonStyle} onClick={() => void addTaskRelation()}>
                      {t("添加关联", "Add Relation")}
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    {taskRelations.map((relation) => (
                      <div
                        key={relation.id}
                        style={{
                          ...microCardStyle,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                      <div style={{ ...helperTextStyle, color: adminTheme.color.text }}>
                          <strong>{relation.target_type}</strong> · {relation.target_id} · {relation.relationship}
                        </div>
                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => void removeTaskRelation(relation.id)}
                        >
                          {t("移除", "Remove")}
                        </button>
                      </div>
                    ))}
                    {!taskRelations.length ? (
                      <div style={helperTextStyle}>{t("暂无关联。", "No relations.")}</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <AdminLanguageDock />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "客户关系 CRM",
  rank: 210,
})

export default CrmPage
