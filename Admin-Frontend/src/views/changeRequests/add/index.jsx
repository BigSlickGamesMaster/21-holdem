import React, { useEffect } from 'react'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import CommonInput from 'shared/components/CommonInput'
import Wrapper from 'shared/components/Wrapper'
import { route } from 'shared/constants/AllRoutes'
import { ReactToastify } from 'shared/utils'
import { buildChangeRequestPayload, createChangeRequestRecord } from 'shared/utils/changeRequestRegister'

const REQUEST_TYPE_OPTIONS = ['Feature', 'Enhancement', 'Bug Fix', 'Content', 'Data']
const PRIORITY_OPTIONS = ['High', 'Medium', 'Low']

function AddChangeRequest() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    mode: 'all',
    defaultValues: {
      requestType: 'Feature',
      priority: 'High',
      module: 'Admin Portal',
      targetRelease: '21 Holdem - Next Admin Iteration',
      owner: 'Brent',
    },
  })

  useEffect(() => {
    document.title = 'Create Change Request | 21 Hold-em'
  }, [])

  async function onSubmit(data) {
    const payload = buildChangeRequestPayload(data)
    const response = await createChangeRequestRecord(payload)
    ReactToastify(response.source === 'api' ? 'Change request created in API storage.' : 'Change request created locally.', 'success')
    navigate(route.changeRequests)
  }

  return (
    <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
      <Wrapper>
        <Row className="gy-3">
          <Col lg={6}>
            <CommonInput
              type="text"
              register={register}
              errors={errors}
              name="title"
              label="Request Title"
              required
              placeholder="Add a clear request title"
              className={`form-control ${errors?.title && 'error'}`}
              validation={{
                required: {
                  value: true,
                  message: 'Request title is required',
                },
              }}
            />
          </Col>
          <Col lg={3}>
            <Form.Group className="form-group w-100">
              <Form.Label>
                Request Type <span className="inputStar">*</span>
              </Form.Label>
              <Form.Select {...register('requestType')}>
                {REQUEST_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col lg={3}>
            <Form.Group className="form-group w-100">
              <Form.Label>
                Priority <span className="inputStar">*</span>
              </Form.Label>
              <Form.Select {...register('priority')}>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col lg={4}>
            <CommonInput
              type="text"
              register={register}
              errors={errors}
              name="module"
              label="Module"
              required
              placeholder="Admin Portal / Lobby / Table Management"
              className={`form-control ${errors?.module && 'error'}`}
              validation={{
                required: {
                  value: true,
                  message: 'Module is required',
                },
              }}
            />
          </Col>
          <Col lg={4}>
            <CommonInput type="text" register={register} errors={errors} name="requestedBy" label="Requested By" placeholder="Requester name" className="form-control" />
          </Col>
          <Col lg={4}>
            <CommonInput type="text" register={register} errors={errors} name="owner" label="Owner" placeholder="Owner / lead" className="form-control" />
          </Col>

          <Col lg={4}>
            <CommonInput type="text" register={register} errors={errors} name="targetRelease" label="Target Release" placeholder="Sprint / milestone / release" className="form-control" />
          </Col>
          <Col lg={8}>
            <CommonInput
              type="textarea"
              register={register}
              errors={errors}
              name="summary"
              label="Summary"
              required
              placeholder="Describe the requested change and why it exists"
              className={`form-control ${errors?.summary && 'error'}`}
              validation={{
                required: {
                  value: true,
                  message: 'Summary is required',
                },
              }}
            />
          </Col>

          <Col lg={6}>
            <CommonInput
              type="textarea"
              register={register}
              errors={errors}
              name="businessValue"
              label="Business Value"
              required
              placeholder="Why this matters to 21 Hold'em"
              className={`form-control ${errors?.businessValue && 'error'}`}
              validation={{
                required: {
                  value: true,
                  message: 'Business value is required',
                },
              }}
            />
          </Col>
          <Col lg={6}>
            <CommonInput
              type="textarea"
              register={register}
              errors={errors}
              name="userStory"
              label="User Story"
              required
              placeholder="As a..., I want..., so that..."
              className={`form-control ${errors?.userStory && 'error'}`}
              validation={{
                required: {
                  value: true,
                  message: 'User story is required',
                },
              }}
            />
          </Col>

          <Col lg={6}>
            <CommonInput
              type="textarea"
              register={register}
              errors={errors}
              name="acceptanceCriteria"
              label="Acceptance Criteria"
              required
              placeholder={'One line per criterion'}
              className={`form-control ${errors?.acceptanceCriteria && 'error'}`}
              validation={{
                required: {
                  value: true,
                  message: 'Acceptance criteria is required',
                },
              }}
            />
          </Col>
          <Col lg={6}>
            <CommonInput
              type="textarea"
              register={register}
              errors={errors}
              name="testPlan"
              label="QA / Test Plan"
              placeholder="One line per test case"
              className="form-control"
            />
          </Col>

          <Col lg={6}>
            <CommonInput
              type="textarea"
              register={register}
              errors={errors}
              name="impactedAreas"
              label="Impacted Areas"
              required
              placeholder="Frontend screens, backend services, tables, reports"
              className={`form-control ${errors?.impactedAreas && 'error'}`}
              validation={{
                required: {
                  value: true,
                  message: 'Impacted areas are required',
                },
              }}
            />
          </Col>
          <Col lg={6}>
            <CommonInput type="textarea" register={register} errors={errors} name="codeAreas" label="Expected Code Areas" placeholder="Files, services, components, routes" className="form-control" />
          </Col>

          <Col lg={4}>
            <CommonInput type="textarea" register={register} errors={errors} name="dependencies" label="Dependencies / Blockers" placeholder="One line per dependency" className="form-control" />
          </Col>
          <Col lg={4}>
            <CommonInput type="textarea" register={register} errors={errors} name="risks" label="Risks" placeholder="One line per risk" className="form-control" />
          </Col>
          <Col lg={4}>
            <CommonInput type="textarea" register={register} errors={errors} name="docsNeeded" label="Documentation Needed" placeholder="One line per document / artifact" className="form-control" />
          </Col>

          <Col xs={12} className="d-flex gap-2">
            <Button variant="primary" type="submit">
              Generate Request Package
            </Button>
            <Button variant="secondary" onClick={() => navigate(route.changeRequests)}>
              Cancel
            </Button>
          </Col>
        </Row>
      </Wrapper>
    </Form>
  )
}

export default AddChangeRequest
