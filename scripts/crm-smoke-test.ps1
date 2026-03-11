Param(
  [string]$BaseUrl = "http://localhost:9000",
  [Parameter(Mandatory = $true)]
  [string]$CustomerId
)

$ErrorActionPreference = "Stop"

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  $uri = "$BaseUrl$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -ContentType "application/json"
  }

  return Invoke-RestMethod -Method $Method -Uri $uri -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 10)
}

Write-Host "[1/10] Create Lead..."
$lead = Invoke-Api -Method Post -Path "/admin/crm/leads" -Body @{
  name = "Smoke Lead"
  email = "smoke.lead@example.com"
  company = "Smoke Pty Ltd"
  source = "smoke-script"
  status = "new"
}
$leadId = $lead.lead.id
Write-Host "Lead created: $leadId"

Write-Host "[2/10] List Leads..."
$leads = Invoke-Api -Method Get -Path "/admin/crm/leads?limit=5&offset=0"
Write-Host "Lead count: $($leads.count)"

Write-Host "[3/10] Update Lead..."
$updatedLead = Invoke-Api -Method Patch -Path "/admin/crm/leads/$leadId" -Body @{
  status = "contacted"
}
Write-Host "Lead updated status: $($updatedLead.lead.status)"

Write-Host "[4/10] Create Opportunity..."
$opportunity = Invoke-Api -Method Post -Path "/admin/crm/opportunities" -Body @{
  name = "Smoke Opportunity"
  estimated_amount = 10000
  customer_id = $CustomerId
  stage = "prospecting"
  lead_id = $leadId
}
$opportunityId = $opportunity.opportunity.id
Write-Host "Opportunity created: $opportunityId"

Write-Host "[5/10] Get Opportunity..."
$oneOpportunity = Invoke-Api -Method Get -Path "/admin/crm/opportunities/$opportunityId"
Write-Host "Opportunity stage: $($oneOpportunity.opportunity.stage)"

Write-Host "[6/10] Update Opportunity..."
$updatedOpportunity = Invoke-Api -Method Patch -Path "/admin/crm/opportunities/$opportunityId" -Body @{
  stage = "negotiation"
}
Write-Host "Opportunity updated stage: $($updatedOpportunity.opportunity.stage)"

Write-Host "[7/10] Create Task..."
$task = Invoke-Api -Method Post -Path "/admin/crm/tasks" -Body @{
  title = "Smoke Follow-up Task"
  type = "call"
  status = "open"
  priority = "high"
  customer_id = $CustomerId
  relations = @(
    @{ target_type = "lead"; target_id = $leadId; relationship = "primary" },
    @{ target_type = "opportunity"; target_id = $opportunityId; relationship = "related" }
  )
}
$taskId = $task.task.id
Write-Host "Task created: $taskId"

Write-Host "[8/10] List Task Relations..."
$taskRelations = Invoke-Api -Method Get -Path "/admin/crm/tasks/$taskId/relations"
Write-Host "Task relations count: $($taskRelations.count)"

Write-Host "[9/10] Update Task..."
$updatedTask = Invoke-Api -Method Patch -Path "/admin/crm/tasks/$taskId" -Body @{
  status = "in_progress"
}
Write-Host "Task updated status: $($updatedTask.task.status)"

Write-Host "[10/10] Cleanup..."
Invoke-Api -Method Delete -Path "/admin/crm/tasks/$taskId" | Out-Null
Invoke-Api -Method Delete -Path "/admin/crm/opportunities/$opportunityId" | Out-Null
Invoke-Api -Method Delete -Path "/admin/crm/leads/$leadId" | Out-Null
Write-Host "Done"
