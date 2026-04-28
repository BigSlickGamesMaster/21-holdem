import {
  createChangeRequest as createChangeRequestApi,
  deleteChangeRequestById,
  getChangeRequestMeta,
  getChangeRequests,
  updateChangeRequestStatus as updateChangeRequestStatusApi,
} from 'query/changeRequests/changeRequests.query'

const STORAGE_KEY = 'holdem_admin_change_requests'

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getStoredChangeRequests() {
  if (!isBrowser()) return []

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)
    const parsedValue = rawValue ? JSON.parse(rawValue) : []
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch (error) {
    return []
  }
}

export function saveStoredChangeRequests(changeRequests) {
  if (!isBrowser()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(changeRequests))
}

async function tryApiRequest(request) {
  try {
    return await request()
  } catch (error) {
    return null
  }
}

function toList(value) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatLabel(value) {
  return value
    .toLowerCase()
    .split(' ')
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ')
}

function formatDateTime(value) {
  return new Date(value).toLocaleString()
}

export function buildChangeRequestPayload(formData) {
  const now = new Date().toISOString()
  const requirementItems = [
    `Deliver the ${formData.requestType.toLowerCase()} request for ${formData.module}.`,
    `Support the business outcome: ${formData.businessValue}.`,
    `Implement the user story: ${formData.userStory}.`,
    ...toList(formData.acceptanceCriteria).map((item) => `Acceptance criteria: ${item}`),
  ]

  const docsChecklist = [
    'Update admin portal change log / release notes.',
    'Document impacted portal screens and user-facing behaviour.',
    'Capture setup, migration, and rollback notes for this request.',
    ...toList(formData.docsNeeded).map((item) => `Documentation required: ${item}`),
  ]

  const codeChecklist = [
    `Review impacted areas: ${formData.impactedAreas}.`,
    `Audit code touchpoints: ${formData.codeAreas}.`,
    ...toList(formData.dependencies).map((item) => `Dependency / blocker: ${item}`),
    ...toList(formData.risks).map((item) => `Risk to mitigate: ${item}`),
  ]

  const qaChecklist = [
    'Verify the primary happy path in the admin portal.',
    'Verify no regression in existing 21 Hold’em admin flows.',
    'Confirm validation, error states, and permissions.',
    ...toList(formData.testPlan).map((item) => `Test case: ${item}`),
  ]

  const changeRequestId = `CR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

  return {
    id: changeRequestId,
    title: formData.title.trim(),
    module: formData.module.trim(),
    requestType: formData.requestType,
    priority: formData.priority,
    status: 'Draft',
    requestedBy: formData.requestedBy.trim(),
    owner: formData.owner.trim(),
    targetRelease: formData.targetRelease.trim(),
    summary: formData.summary.trim(),
    businessValue: formData.businessValue.trim(),
    userStory: formData.userStory.trim(),
    acceptanceCriteria: toList(formData.acceptanceCriteria),
    impactedAreas: formData.impactedAreas.trim(),
    dependencies: toList(formData.dependencies),
    risks: toList(formData.risks),
    docsNeeded: toList(formData.docsNeeded),
    codeAreas: formData.codeAreas.trim(),
    testPlan: toList(formData.testPlan),
    createdAt: now,
    updatedAt: now,
    generated: {
      overview: `${formData.title.trim()} is a ${formData.priority.toLowerCase()} priority ${formData.requestType.toLowerCase()} request for ${formData.module.trim()}.`,
      requirements: requirementItems,
      documentation: docsChecklist,
      codePlan: codeChecklist,
      qaChecklist,
      implementationNotes: [
        `Status starts as Draft and should move through ${['Draft', 'Scoped', 'In Progress', 'Ready for Review', 'Done'].join(', ')} as work advances.`,
        `Requested by ${formData.requestedBy.trim() || 'Unknown requester'} with target release ${formData.targetRelease.trim() || 'TBD'}.`,
        `Priority is ${formatLabel(formData.priority)} and owner is ${formData.owner.trim() || 'Unassigned'}.`,
      ],
    },
  }
}

export function upsertChangeRequest(changeRequest) {
  const items = getStoredChangeRequests()
  const existingIndex = items.findIndex((item) => item.id === changeRequest.id)

  if (existingIndex >= 0) {
    items[existingIndex] = {
      ...items[existingIndex],
      ...changeRequest,
      updatedAt: new Date().toISOString(),
    }
  } else {
    items.unshift(changeRequest)
  }

  saveStoredChangeRequests(items)
  return items
}

export function deleteChangeRequest(id) {
  const nextItems = getStoredChangeRequests().filter((item) => item.id !== id)
  saveStoredChangeRequests(nextItems)
  return nextItems
}

export function updateChangeRequestStatus(id, status) {
  const nextItems = getStoredChangeRequests().map((item) =>
    item.id === id
      ? {
          ...item,
          status,
          updatedAt: new Date().toISOString(),
        }
      : item
  )

  saveStoredChangeRequests(nextItems)
  return nextItems
}

export async function loadChangeRequestsSource() {
  const metaResponse = await tryApiRequest(() => getChangeRequestMeta())
  const apiEnabled = Boolean(metaResponse?.data?.data?.persistenceEnabled)

  if (apiEnabled) {
    const listResponse = await tryApiRequest(() => getChangeRequests())
    if (Array.isArray(listResponse?.data?.data)) {
      return {
        source: 'api',
        items: listResponse.data.data,
        meta: metaResponse.data.data,
      }
    }
  }

  return {
    source: 'local',
    items: getStoredChangeRequests(),
    meta: metaResponse?.data?.data || { persistenceEnabled: false, storageMode: 'disabled', dbWritesEnabled: false },
  }
}

export async function createChangeRequestRecord(changeRequest) {
  const metaResponse = await tryApiRequest(() => getChangeRequestMeta())
  const apiEnabled = Boolean(metaResponse?.data?.data?.persistenceEnabled)

  if (apiEnabled) {
    const response = await tryApiRequest(() => createChangeRequestApi(changeRequest))
    if (response?.data?.data) {
      return {
        source: 'api',
        item: response.data.data,
      }
    }
  }

  const items = upsertChangeRequest(changeRequest)
  return {
    source: 'local',
    item: items[0],
  }
}

export async function updateChangeRequestStatusRecord(id, status) {
  const metaResponse = await tryApiRequest(() => getChangeRequestMeta())
  const apiEnabled = Boolean(metaResponse?.data?.data?.persistenceEnabled)

  if (apiEnabled) {
    const response = await tryApiRequest(() => updateChangeRequestStatusApi({ id, status }))
    if (response?.data?.data) {
      return {
        source: 'api',
        item: response.data.data,
      }
    }
  }

  const items = updateChangeRequestStatus(id, status)
  return {
    source: 'local',
    items,
  }
}

export async function deleteChangeRequestRecord(id) {
  const metaResponse = await tryApiRequest(() => getChangeRequestMeta())
  const apiEnabled = Boolean(metaResponse?.data?.data?.persistenceEnabled)

  if (apiEnabled) {
    const response = await tryApiRequest(() => deleteChangeRequestById(id))
    if (response?.data?.data) {
      const listResponse = await tryApiRequest(() => getChangeRequests())
      return {
        source: 'api',
        items: Array.isArray(listResponse?.data?.data) ? listResponse.data.data : [],
      }
    }
  }

  return {
    source: 'local',
    items: deleteChangeRequest(id),
  }
}

export function exportChangeRequestMarkdown(changeRequest) {
  const sections = [
    `# ${changeRequest.id} - ${changeRequest.title}`,
    `## Overview\n- Module: ${changeRequest.module}\n- Type: ${changeRequest.requestType}\n- Priority: ${changeRequest.priority}\n- Status: ${changeRequest.status}\n- Requested By: ${changeRequest.requestedBy || 'N/A'}\n- Owner: ${changeRequest.owner || 'Unassigned'}\n- Target Release: ${changeRequest.targetRelease || 'TBD'}`,
    `## Summary\n${changeRequest.summary || 'No summary provided.'}`,
    `## Business Value\n${changeRequest.businessValue || 'No business value provided.'}`,
    `## User Story\n${changeRequest.userStory || 'No user story provided.'}`,
    `## Acceptance Criteria\n${(changeRequest.acceptanceCriteria || []).map((item) => `- ${item}`).join('\n') || '- None recorded'}`,
    `## Generated Requirements\n${(changeRequest.generated?.requirements || []).map((item) => `- ${item}`).join('\n') || '- None generated'}`,
    `## Documentation Checklist\n${(changeRequest.generated?.documentation || []).map((item) => `- ${item}`).join('\n') || '- None generated'}`,
    `## Code Plan\n${(changeRequest.generated?.codePlan || []).map((item) => `- ${item}`).join('\n') || '- None generated'}`,
    `## QA Checklist\n${(changeRequest.generated?.qaChecklist || []).map((item) => `- ${item}`).join('\n') || '- None generated'}`,
  ]

  return sections.join('\n\n')
}

export { formatDateTime }
