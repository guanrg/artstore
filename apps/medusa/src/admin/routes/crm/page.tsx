import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useMemo, useState, type CSSProperties } from "react"

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
    background: `${color}18`,
    border: `1px solid ${color}40`,
    borderRadius: 999,
    padding: "2px 8px",
  }
}

const shellStyle: CSSProperties = {
  padding: 16,
  display: "grid",
  gap: 12,
  background: "#f3f6fb",
}

const topCardStyle: CSSProperties = {
  border: "1px solid #d5deea",
  background: "linear-gradient(180deg, #f8fbff 0%, #eff4fb 100%)",
  borderRadius: 12,
  padding: 14,
}

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "380px 1fr",
  gap: 12,
  alignItems: "start",
}

const panelStyle: CSSProperties = {
  border: "1px solid #d5deea",
  background: "#ffffff",
  borderRadius: 12,
  padding: 12,
}

const listItemBase: CSSProperties = {
  border: "1px solid #dbe3ef",
  borderRadius: 10,
  padding: 10,
  cursor: "pointer",
  background: "#fff",
}

const inputStyle: CSSProperties = {
  border: "1px solid #cdd8e8",
  borderRadius: 8,
  padding: "7px 10px",
  fontSize: 13,
  width: "100%",
}

const buttonStyle: CSSProperties = {
  border: "1px solid #c4d4ef",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
  background: "#f8fbff",
}

const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  border: "1px solid #1f5fbf",
  background: "#1f5fbf",
  color: "#fff",
}

const CrmPage = () => {
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
        setError(e instanceof Error ? e.message : "Load failed")
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
        throw new Error("Lead required fields: name/email/company/source")
      }

      if (selectedLeadId) {
        await api(`/admin/crm/leads/${selectedLeadId}`, "PATCH", {
          ...leadForm,
          customer_id: leadForm.customer_id || null,
        })
        setMessage("Lead updated")
      } else {
        await api(`/admin/crm/leads`, "POST", {
          ...leadForm,
          customer_id: leadForm.customer_id || undefined,
        })
        setMessage("Lead created")
      }

      await loadLeads()
      if (!selectedLeadId) {
        setLeadSearch("")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setLoading(false)
    }
  }

  const deleteLead = async (id: string) => {
    if (!window.confirm(`Delete lead ${id}?`)) return
    try {
      setLoading(true)
      await api(`/admin/crm/leads/${id}`, "DELETE")
      setMessage("Lead deleted")
      if (selectedLeadId === id) {
        setSelectedLeadId("")
      }
      await loadLeads()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setLoading(false)
    }
  }

  const convertLead = async () => {
    if (!selectedLeadId) {
      setError("Select a lead first")
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
      setMessage("Lead converted to opportunity")
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
      setError(e instanceof Error ? e.message : "Convert failed")
    } finally {
      setLoading(false)
    }
  }

  const saveOpportunity = async () => {
    try {
      setLoading(true)
      if (!opportunityForm.name || !opportunityForm.customer_id) {
        throw new Error("Opportunity required fields: name/customer_id")
      }

      if (selectedOpportunityId) {
        await api(`/admin/crm/opportunities/${selectedOpportunityId}`, "PATCH", {
          ...opportunityForm,
          expected_close_date: opportunityForm.expected_close_date || null,
          lead_id: opportunityForm.lead_id || null,
        })
        setMessage("Opportunity updated")
      } else {
        await api(`/admin/crm/opportunities`, "POST", {
          ...opportunityForm,
          expected_close_date: opportunityForm.expected_close_date || undefined,
          lead_id: opportunityForm.lead_id || undefined,
        })
        setMessage("Opportunity created")
      }

      await loadOpportunities()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setLoading(false)
    }
  }

  const deleteOpportunity = async (id: string) => {
    if (!window.confirm(`Delete opportunity ${id}?`)) return
    try {
      setLoading(true)
      await api(`/admin/crm/opportunities/${id}`, "DELETE")
      setMessage("Opportunity deleted")
      if (selectedOpportunityId === id) {
        setSelectedOpportunityId("")
      }
      await loadOpportunities()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setLoading(false)
    }
  }

  const saveTask = async () => {
    try {
      setLoading(true)
      if (!taskForm.title) {
        throw new Error("Task required field: title")
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
        setMessage("Task updated")
      } else {
        await api(`/admin/crm/tasks`, "POST", {
          ...taskForm,
          description: taskForm.description || undefined,
          due_date: taskForm.due_date || undefined,
          completed_at: taskForm.completed_at || undefined,
          owner_id: taskForm.owner_id || undefined,
          customer_id: taskForm.customer_id || undefined,
        })
        setMessage("Task created")
      }

      await loadTasks()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setLoading(false)
    }
  }

  const deleteTask = async (id: string) => {
    if (!window.confirm(`Delete task ${id}?`)) return
    try {
      setLoading(true)
      await api(`/admin/crm/tasks/${id}`, "DELETE")
      setMessage("Task deleted")
      if (selectedTaskId === id) {
        setSelectedTaskId("")
      }
      await loadTasks()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setLoading(false)
    }
  }

  const addTaskRelation = async () => {
    if (!selectedTaskId) {
      setError("Select a task first")
      return
    }
    if (!taskRelationForm.target_type || !taskRelationForm.target_id) {
      setError("Relation required: target_type + target_id")
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
      setMessage("Task relation added")
      await loadTaskRelations(selectedTaskId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add relation failed")
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
      setMessage("Task relation removed")
      await loadTaskRelations(selectedTaskId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete relation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={shellStyle}>
      <div style={topCardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: "#16325c" }}>CRM Workspace</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#3f4f65" }}>
              Salesforce-style object workspace for Leads, Opportunities and Tasks.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={badgeStyle("#0f4c9c")}>Leads {leads.length}</span>
            <span style={badgeStyle("#1f7a37")}>Opps {opportunities.length}</span>
            <span style={badgeStyle("#7a4f01")}>Tasks {tasks.length}</span>
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            type="button"
            style={tab === "lead" ? primaryButtonStyle : buttonStyle}
            onClick={() => setTab("lead")}
          >
            Leads
          </button>
          <button
            type="button"
            style={tab === "opportunity" ? primaryButtonStyle : buttonStyle}
            onClick={() => setTab("opportunity")}
          >
            Opportunities
          </button>
          <button
            type="button"
            style={tab === "task" ? primaryButtonStyle : buttonStyle}
            onClick={() => setTab("task")}
          >
            Tasks
          </button>
        </div>
        {loading ? <p style={{ margin: "10px 0 0", color: "#334155" }}>Loading...</p> : null}
        {error ? <p style={{ margin: "10px 0 0", color: "#b91c1c" }}>{error}</p> : null}
        {notice ? <p style={{ margin: "10px 0 0", color: "#166534" }}>{notice}</p> : null}
      </div>

      <div style={layoutStyle}>
        <div style={panelStyle}>
          {tab === "lead" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Lead List</strong>
                <button type="button" style={buttonStyle} onClick={() => setSelectedLeadId("")}>
                  New
                </button>
              </div>
              <input
                style={inputStyle}
                placeholder="Search lead"
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
              />
              <select
                style={{ ...inputStyle, marginTop: 8 }}
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value as LeadStatusFilter)}
              >
                <option value="">All statuses</option>
                <option value="new">new</option>
                <option value="contacted">contacted</option>
                <option value="qualified">qualified</option>
                <option value="lost">lost</option>
              </select>
              <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 620, overflow: "auto" }}>
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      ...listItemBase,
                      borderColor: selectedLeadId === lead.id ? "#1f5fbf" : "#dbe3ef",
                      background: selectedLeadId === lead.id ? "#eff5ff" : "#fff",
                    }}
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <div style={{ fontWeight: 700 }}>{lead.name}</div>
                    <div style={{ fontSize: 12, color: "#4b5563" }}>{lead.email}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <span style={badgeStyle("#4b5563")}>{lead.status}</span>
                      <span style={badgeStyle("#1f5fbf")}>{lead.company}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {tab === "opportunity" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Opportunity List</strong>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => setSelectedOpportunityId("")}
                >
                  New
                </button>
              </div>
              <input
                style={inputStyle}
                placeholder="Search opportunity"
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
                <option value="">All stages</option>
                <option value="prospecting">prospecting</option>
                <option value="negotiation">negotiation</option>
                <option value="closed_won">closed_won</option>
                <option value="closed_lost">closed_lost</option>
              </select>
              <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 620, overflow: "auto" }}>
                {filteredOpportunities.map((op) => (
                  <div
                    key={op.id}
                    style={{
                      ...listItemBase,
                      borderColor: selectedOpportunityId === op.id ? "#1f5fbf" : "#dbe3ef",
                      background: selectedOpportunityId === op.id ? "#eff5ff" : "#fff",
                    }}
                    onClick={() => setSelectedOpportunityId(op.id)}
                  >
                    <div style={{ fontWeight: 700 }}>{op.name}</div>
                    <div style={{ fontSize: 12, color: "#4b5563" }}>{op.customer_id}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <span style={badgeStyle("#4b5563")}>{op.stage}</span>
                      <span style={badgeStyle("#1f7a37")}>{String(op.estimated_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {tab === "task" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Task List</strong>
                <button type="button" style={buttonStyle} onClick={() => setSelectedTaskId("")}>
                  New
                </button>
              </div>
              <input
                style={inputStyle}
                placeholder="Search task"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
              />
              <select
                style={{ ...inputStyle, marginTop: 8 }}
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value as TaskStatusFilter)}
              >
                <option value="">All statuses</option>
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
                <option value="canceled">canceled</option>
              </select>
              <div style={{ marginTop: 10, display: "grid", gap: 8, maxHeight: 620, overflow: "auto" }}>
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      ...listItemBase,
                      borderColor: selectedTaskId === task.id ? "#1f5fbf" : "#dbe3ef",
                      background: selectedTaskId === task.id ? "#eff5ff" : "#fff",
                    }}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div style={{ fontWeight: 700 }}>{task.title}</div>
                    <div style={{ fontSize: 12, color: "#4b5563" }}>{task.description || "-"}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <span style={badgeStyle("#4b5563")}>{task.status}</span>
                      <span style={badgeStyle("#7a4f01")}>{task.priority}</span>
                      <span style={badgeStyle("#1f5fbf")}>{task.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div style={{ ...panelStyle, display: "grid", gap: 12 }}>
          {tab === "lead" ? (
            <>
              <div>
                <h3 style={{ margin: 0 }}>Lead Detail</h3>
                <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 12 }}>
                  {selectedLead ? `Editing ${selectedLead.id}` : "Creating new lead"}
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                <input
                  style={inputStyle}
                  placeholder="Name"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm((v) => ({ ...v, name: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder="Email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm((v) => ({ ...v, email: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder="Company"
                  value={leadForm.company}
                  onChange={(e) => setLeadForm((v) => ({ ...v, company: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder="Source"
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
                  <option value="new">new</option>
                  <option value="contacted">contacted</option>
                  <option value="qualified">qualified</option>
                  <option value="lost">lost</option>
                </select>
                <input
                  style={inputStyle}
                  placeholder="Customer ID"
                  value={leadForm.customer_id}
                  onChange={(e) => setLeadForm((v) => ({ ...v, customer_id: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={primaryButtonStyle} onClick={() => void saveLead()}>
                  {selectedLead ? "Save Lead" : "Create Lead"}
                </button>
                {selectedLead ? (
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => void deleteLead(selectedLead.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, display: "grid", gap: 8 }}>
                <h4 style={{ margin: 0 }}>Convert Lead</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  <input
                    style={inputStyle}
                    placeholder="Opportunity Name"
                    value={convertForm.name}
                    onChange={(e) => setConvertForm((v) => ({ ...v, name: e.target.value }))}
                  />
                  <input
                    style={inputStyle}
                    placeholder="Estimated Amount"
                    value={convertForm.estimated_amount}
                    onChange={(e) =>
                      setConvertForm((v) => ({ ...v, estimated_amount: e.target.value }))
                    }
                  />
                  <input
                    style={inputStyle}
                    placeholder="Customer ID"
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
                    <option value="prospecting">prospecting</option>
                    <option value="negotiation">negotiation</option>
                    <option value="closed_won">closed_won</option>
                    <option value="closed_lost">closed_lost</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    style={{ ...inputStyle, maxWidth: 280 }}
                    placeholder="Expected Close Date"
                    value={convertForm.expected_close_date}
                    onChange={(e) =>
                      setConvertForm((v) => ({ ...v, expected_close_date: e.target.value }))
                    }
                  />
                  <button type="button" style={primaryButtonStyle} onClick={() => void convertLead()}>
                    Convert to Opportunity
                  </button>
                </div>
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                <h4 style={{ margin: 0 }}>Related Activities (Tasks)</h4>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {relatedTasks.map((task) => (
                    <div key={task.id} style={{ ...listItemBase, padding: "8px 10px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {task.status} · {task.priority} · {task.type}
                      </div>
                    </div>
                  ))}
                  {!relatedTasks.length ? (
                    <div style={{ fontSize: 12, color: "#64748b" }}>No tasks linked.</div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {tab === "opportunity" ? (
            <>
              <div>
                <h3 style={{ margin: 0 }}>Opportunity Detail</h3>
                <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 12 }}>
                  {selectedOpportunity ? `Editing ${selectedOpportunity.id}` : "Creating new opportunity"}
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                <input
                  style={inputStyle}
                  placeholder="Name"
                  value={opportunityForm.name}
                  onChange={(e) => setOpportunityForm((v) => ({ ...v, name: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder="Estimated Amount"
                  value={opportunityForm.estimated_amount}
                  onChange={(e) =>
                    setOpportunityForm((v) => ({ ...v, estimated_amount: e.target.value }))
                  }
                />
                <input
                  style={inputStyle}
                  placeholder="Customer ID"
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
                  <option value="prospecting">prospecting</option>
                  <option value="negotiation">negotiation</option>
                  <option value="closed_won">closed_won</option>
                  <option value="closed_lost">closed_lost</option>
                </select>
                <input
                  style={inputStyle}
                  placeholder="Expected Close Date"
                  value={opportunityForm.expected_close_date}
                  onChange={(e) =>
                    setOpportunityForm((v) => ({ ...v, expected_close_date: e.target.value }))
                  }
                />
                <input
                  style={inputStyle}
                  placeholder="Lead ID"
                  value={opportunityForm.lead_id}
                  onChange={(e) => setOpportunityForm((v) => ({ ...v, lead_id: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={primaryButtonStyle}
                  onClick={() => void saveOpportunity()}
                >
                  {selectedOpportunity ? "Save Opportunity" : "Create Opportunity"}
                </button>
                {selectedOpportunity ? (
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => void deleteOpportunity(selectedOpportunity.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                <h4 style={{ margin: 0 }}>Related Activities (Tasks)</h4>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {relatedTasks.map((task) => (
                    <div key={task.id} style={{ ...listItemBase, padding: "8px 10px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {task.status} · {task.priority} · {task.type}
                      </div>
                    </div>
                  ))}
                  {!relatedTasks.length ? (
                    <div style={{ fontSize: 12, color: "#64748b" }}>No tasks linked.</div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {tab === "task" ? (
            <>
              <div>
                <h3 style={{ margin: 0 }}>Task Detail</h3>
                <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 12 }}>
                  {selectedTask ? `Editing ${selectedTask.id}` : "Creating new task"}
                </p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                <input
                  style={inputStyle}
                  placeholder="Title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((v) => ({ ...v, title: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder="Description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((v) => ({ ...v, description: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder="Due Date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm((v) => ({ ...v, due_date: e.target.value }))}
                />
                <select
                  style={inputStyle}
                  value={taskForm.type}
                  onChange={(e) => setTaskForm((v) => ({ ...v, type: e.target.value as Task["type"] }))}
                >
                  <option value="todo">todo</option>
                  <option value="call">call</option>
                  <option value="email">email</option>
                  <option value="meeting">meeting</option>
                  <option value="follow_up">follow_up</option>
                </select>
                <select
                  style={inputStyle}
                  value={taskForm.status}
                  onChange={(e) =>
                    setTaskForm((v) => ({ ...v, status: e.target.value as Task["status"] }))
                  }
                >
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="completed">completed</option>
                  <option value="canceled">canceled</option>
                </select>
                <select
                  style={inputStyle}
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm((v) => ({ ...v, priority: e.target.value as Task["priority"] }))
                  }
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="urgent">urgent</option>
                </select>
                <input
                  style={inputStyle}
                  placeholder="Owner ID"
                  value={taskForm.owner_id}
                  onChange={(e) => setTaskForm((v) => ({ ...v, owner_id: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder="Customer ID"
                  value={taskForm.customer_id}
                  onChange={(e) => setTaskForm((v) => ({ ...v, customer_id: e.target.value }))}
                />
                <input
                  style={inputStyle}
                  placeholder="Completed At"
                  value={taskForm.completed_at}
                  onChange={(e) =>
                    setTaskForm((v) => ({ ...v, completed_at: e.target.value }))
                  }
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={primaryButtonStyle} onClick={() => void saveTask()}>
                  {selectedTask ? "Save Task" : "Create Task"}
                </button>
                {selectedTask ? (
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => void deleteTask(selectedTask.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>

              {selectedTask ? (
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, display: "grid", gap: 8 }}>
                  <h4 style={{ margin: 0 }}>Related To</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    <input
                      style={inputStyle}
                      placeholder="target_type"
                      value={taskRelationForm.target_type}
                      onChange={(e) =>
                        setTaskRelationForm((v) => ({ ...v, target_type: e.target.value }))
                      }
                    />
                    <input
                      style={inputStyle}
                      placeholder="target_id"
                      value={taskRelationForm.target_id}
                      onChange={(e) =>
                        setTaskRelationForm((v) => ({ ...v, target_id: e.target.value }))
                      }
                    />
                    <input
                      style={inputStyle}
                      placeholder="relationship"
                      value={taskRelationForm.relationship}
                      onChange={(e) =>
                        setTaskRelationForm((v) => ({ ...v, relationship: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <button type="button" style={buttonStyle} onClick={() => void addTaskRelation()}>
                      Add Relation
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    {taskRelations.map((relation) => (
                      <div
                        key={relation.id}
                        style={{
                          ...listItemBase,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 10px",
                        }}
                      >
                        <div style={{ fontSize: 12 }}>
                          <strong>{relation.target_type}</strong> · {relation.target_id} · {relation.relationship}
                        </div>
                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => void removeTaskRelation(relation.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    {!taskRelations.length ? (
                      <div style={{ fontSize: 12, color: "#64748b" }}>No relations.</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "CRM",
  rank: 210,
})

export default CrmPage
