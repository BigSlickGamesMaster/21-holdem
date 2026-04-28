import React, { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Col, Form, Row, Table } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import DataTable from 'shared/components/DataTable'
import TopBar from 'shared/components/Topbar'
import Wrapper from 'shared/components/Wrapper'
import { route } from 'shared/constants/AllRoutes'
import { changeRequestColumns } from 'shared/constants/TableHeaders'
import { ReactToastify } from 'shared/utils'
import {
  deleteChangeRequestRecord,
  exportChangeRequestMarkdown,
  formatDateTime,
  loadChangeRequestsSource,
  updateChangeRequestStatusRecord,
} from 'shared/utils/changeRequestRegister'

const STATUS_OPTIONS = ['Draft', 'Scoped', 'In Progress', 'Ready for Review', 'Done']

function ChangeRequests() {
  const navigate = useNavigate()
  const [changeRequests, setChangeRequests] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [storageMode, setStorageMode] = useState('local')

  useEffect(() => {
    document.title = 'Change Requests | 21 Hold-em'
    async function loadItems() {
      const response = await loadChangeRequestsSource()
      setChangeRequests(response.items)
      setSelectedId(response.items[0]?.id || null)
      setStorageMode(response.source)
    }
    loadItems()
  }, [])

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) return changeRequests

    return changeRequests.filter((item) =>
      [item.id, item.title, item.module, item.priority, item.status, item.requestedBy]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    )
  }, [changeRequests, searchTerm])

  const selectedRequest = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null

  useEffect(() => {
    if (selectedRequest && selectedRequest.id !== selectedId) {
      setSelectedId(selectedRequest.id)
    }
  }, [selectedId, selectedRequest])

  async function handleDelete(id) {
    const response = await deleteChangeRequestRecord(id)
    const nextItems = response.items
    setChangeRequests(nextItems)
    setSelectedId(nextItems[0]?.id || null)
    setStorageMode(response.source)
    ReactToastify('Change request removed.', 'success')
  }

  async function handleStatusChange(id, status) {
    const response = await updateChangeRequestStatusRecord(id, status)
    const nextItems = response.items || changeRequests.map((item) => (item.id === id ? response.item : item))
    setChangeRequests(nextItems)
    setStorageMode(response.source)
    ReactToastify('Change request status updated.', 'success')
  }

  async function handleCopy(changeRequest) {
    try {
      await navigator.clipboard.writeText(exportChangeRequestMarkdown(changeRequest))
      ReactToastify('Change request package copied.', 'success')
    } catch (error) {
      ReactToastify('Copy failed for this browser session.', 'error')
    }
  }

  return (
    <>
      <TopBar
        buttons={[
          {
            text: 'Create Request',
            icon: 'icon-add',
            type: 'primary',
            clickEventName: 'createRequest',
          },
        ]}
        btnEvent={() => navigate(route.addChangeRequest)}
        searchEvent={setSearchTerm}
      />

      <Row className="gy-3">
        <Col xl={7}>
          <DataTable
            columns={changeRequestColumns}
            totalRecord={filteredItems.length}
            header={{
              left: {
                search: false,
                rows: false,
              },
              right: {},
            }}
          >
            {filteredItems.map((item, index) => (
              <tr
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                style={{ cursor: 'pointer', backgroundColor: selectedRequest?.id === item.id ? '#f5f8ff' : 'transparent' }}
              >
                <td className="text-center">{item.id}</td>
                <td className="text-center">{item.title}</td>
                <td className="text-center">{item.module}</td>
                <td className="text-center">
                  <Badge bg={item.priority === 'High' ? 'danger' : item.priority === 'Medium' ? 'warning' : 'secondary'}>{item.priority}</Badge>
                </td>
                <td className="text-center">{item.status}</td>
                <td className="text-center">{item.targetRelease || 'TBD'}</td>
                <td className="text-center">{formatDateTime(item.updatedAt)}</td>
              </tr>
            ))}
          </DataTable>
        </Col>

        <Col xl={5}>
          <Wrapper className="h-100">
            {!selectedRequest && (
              <div>
                <h4 className="mb-2">No change requests yet</h4>
                <p className="mb-0">Use Create Request to capture a temporary request register entry inside the admin portal.</p>
              </div>
            )}

            {selectedRequest && (
              <div className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                  <div>
                    <h4 className="mb-1">{selectedRequest.title}</h4>
                    <div className="text-muted">
                      {selectedRequest.id} · {storageMode === 'api' ? 'API-backed' : 'Local-only'}
                    </div>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button variant="outline-primary" size="sm" onClick={() => handleCopy(selectedRequest)}>
                      Copy Package
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(selectedRequest.id)}>
                      Delete
                    </Button>
                  </div>
                </div>

                <Row className="gy-2">
                  <Col sm={6}>
                    <strong>Module</strong>
                    <div>{selectedRequest.module}</div>
                  </Col>
                  <Col sm={6}>
                    <strong>Type</strong>
                    <div>{selectedRequest.requestType}</div>
                  </Col>
                  <Col sm={6}>
                    <strong>Priority</strong>
                    <div>{selectedRequest.priority}</div>
                  </Col>
                  <Col sm={6}>
                    <strong>Status</strong>
                    <Form.Select value={selectedRequest.status} onChange={(event) => handleStatusChange(selectedRequest.id, event.target.value)}>
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                  <Col sm={6}>
                    <strong>Requested By</strong>
                    <div>{selectedRequest.requestedBy || 'N/A'}</div>
                  </Col>
                  <Col sm={6}>
                    <strong>Owner</strong>
                    <div>{selectedRequest.owner || 'Unassigned'}</div>
                  </Col>
                </Row>

                <div>
                  <h5>Summary</h5>
                  <p className="mb-0">{selectedRequest.summary}</p>
                </div>

                <div>
                  <h5>Generated Package</h5>
                  <Table borderless size="sm" className="mb-0">
                    <tbody>
                      <tr>
                        <td style={{ width: '38%' }}><strong>Requirements</strong></td>
                        <td>{selectedRequest.generated.requirements.length} items</td>
                      </tr>
                      <tr>
                        <td><strong>Documentation</strong></td>
                        <td>{selectedRequest.generated.documentation.length} items</td>
                      </tr>
                      <tr>
                        <td><strong>Code Plan</strong></td>
                        <td>{selectedRequest.generated.codePlan.length} items</td>
                      </tr>
                      <tr>
                        <td><strong>QA Checklist</strong></td>
                        <td>{selectedRequest.generated.qaChecklist.length} items</td>
                      </tr>
                    </tbody>
                  </Table>
                </div>

                <div>
                  <h5>Requirements</h5>
                  <ul className="mb-0 ps-3">
                    {selectedRequest.generated.requirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5>Documentation</h5>
                  <ul className="mb-0 ps-3">
                    {selectedRequest.generated.documentation.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5>Code Plan</h5>
                  <ul className="mb-0 ps-3">
                    {selectedRequest.generated.codePlan.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5>QA Checklist</h5>
                  <ul className="mb-0 ps-0" style={{ listStyle: 'none' }}>
                    {selectedRequest.generated.qaChecklist.map((item) => (
                      <li key={item}>
                        <Form.Check checked={false} readOnly label={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Wrapper>
        </Col>
      </Row>
    </>
  )
}

export default ChangeRequests
