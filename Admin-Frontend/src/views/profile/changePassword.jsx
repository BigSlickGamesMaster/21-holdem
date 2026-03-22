import React, { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Form, Row, Col, Button, InputGroup, Spinner } from 'react-bootstrap'

import { validationErrors } from 'shared/constants/ValidationErrors'
import { PASSWORD } from 'shared/constants'
import { useMutation } from 'react-query'
import { changePassWord } from 'query/auth/auth.query'
import { useNavigate } from 'react-router-dom'
import Wrapper from 'shared/components/Wrapper'
import { ReactToastify } from 'shared/utils'
import { route } from 'shared/constants/AllRoutes'

export default function ChangePassword() {
  const navigate = useNavigate()
  const sNewPassword = useRef({})

  const {
    control,
    clearErrors,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm({ mode: 'all' })
  sNewPassword.current = watch('sNewPassword')

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setConfirmPassword] = useState(false)

  //* CHANGE PASSWORD
  const { mutate, isLoading } = useMutation(changePassWord, {
    onSuccess: response => {
      ReactToastify(response?.data?.message, 'success')
      localStorage.clear()
      navigate('/login')
    },
    onError: error => {
      ReactToastify(error?.response?.data?.message, 'error')
    },
  })

  const onSubmit = data => mutate({ sNewPassword: data.sConfirmPassword, sPassword: data.sCurrentPassword })

  const handleCurrentPasswordToggle = () => setShowCurrentPassword(!showCurrentPassword)
  const handleNewPasswordToggle = () => setShowNewPassword(!showNewPassword)
  const handleConfirmPasswordToggle = () => setConfirmPassword(!showConfirmPassword)

  useEffect(() => {
    document.title = 'Change Password | 21 Hold-em'
  }, [])
  return (
    <Row className="d-flex justify-content-center">
      <Col xxl={4} lg={6}>
        <Wrapper>
          <Form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
            <Col lg={12}>
              <Form.Group className="form-group">
                <Form.Label>
                  Current Password
                  <span className="inputStar">*</span>
                </Form.Label>
                <InputGroup>
                  <Controller
                    name="sCurrentPassword"
                    control={control}
                    render={({ field: { ref, value, onChange } }) => (
                      <Form.Control
                        className={`form-control ${errors.sCurrentPassword && 'error'}`}
                        placeholder="Enter Current Password"
                        type={!showCurrentPassword ? 'password' : 'text'}
                        name="sCurrentPassword"
                        ref={ref}
                        value={value}
                        onChange={e => {
                          e.target.value = e.target.value?.trim()
                          onChange(e)
                        }}
                      />
                    )}
                    rules={{
                      required: 'Current Password is required',
                    }}
                  />
                  <Button onClick={handleCurrentPasswordToggle} variant="link" className="icon-right">
                    <i className={showCurrentPassword ? 'icon-visibility' : 'icon-visibility-off'}></i>
                  </Button>
                </InputGroup>
                {errors.sCurrentPassword && <Form.Control.Feedback type="invalid">{errors.sCurrentPassword.message}</Form.Control.Feedback>}
              </Form.Group>
            </Col>
            <Col lg={12}>
              <Form.Group className="form-group mt-2">
                <Form.Label>
                  New Password
                  <span className="inputStar">*</span>
                </Form.Label>
                <InputGroup>
                  <Controller
                    name="sNewPassword"
                    control={control}
                    render={({ field: { ref, value, onChange } }) => (
                      <Form.Control
                        className={`form-control ${errors.sNewPassword && 'error'}`}
                        placeholder="Enter New Password"
                        type={!showNewPassword ? 'password' : 'text'}
                        name="sNewPassword"
                        ref={ref}
                        value={value}
                        onChange={e => {
                          e.target.value = e.target.value?.trim()

                          if (e.target.value !== watch('sConfirmPassword') && watch('sConfirmPassword') !== undefined) {
                            setError('sConfirmPassword', {
                              type: 'validate',
                              message: 'Passwords does not match.',
                            })
                          } else {
                            clearErrors('sConfirmPassword')
                          }
                          onChange(e)
                        }}
                      />
                    )}
                    rules={{
                      required: 'New Password is required',
                      pattern: {
                        value: PASSWORD,
                        message: 'Your password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
                      },
                      maxLength: {
                        value: 12,
                        message: validationErrors.rangeLength(8, 12),
                      },
                      minLength: {
                        value: 8,
                        message: validationErrors.rangeLength(8, 12),
                      },
                    }}
                  />
                  <Button onClick={handleNewPasswordToggle} variant="link" className="icon-right">
                    <i className={showNewPassword ? 'icon-visibility' : 'icon-visibility-off'}></i>
                  </Button>
                </InputGroup>
                {errors.sNewPassword && <Form.Control.Feedback type="invalid">{errors.sNewPassword.message}</Form.Control.Feedback>}
              </Form.Group>
            </Col>
            <Col lg={12}>
              <Form.Group className="form-group mt-2">
                <Form.Label>
                  Confirm New password
                  <span className="inputStar">*</span>
                </Form.Label>
                <InputGroup>
                  <Controller
                    name="sConfirmPassword"
                    control={control}
                    render={({ field: { ref, value, onChange } }) => (
                      <Form.Control
                        className={`form-control ${errors.sConfirmPassword && 'error'}`}
                        placeholder="Enter Confirm New Password"
                        type={!showConfirmPassword ? 'password' : 'text'}
                        name="sConfirmPassword"
                        ref={ref}
                        value={value}
                        onChange={e => {
                          e.target.value = e.target.value?.trim()
                          onChange(e)
                        }}
                      />
                    )}
                    rules={{
                      required: 'Confirm New Password is required',
                      pattern: {
                        value: PASSWORD,
                        message: 'Your password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
                      },
                      validate: value => (value !== sNewPassword.current ? 'Password does not match.' : clearErrors('sConfirmPassword')),
                    }}
                  />
                  <Button onClick={handleConfirmPasswordToggle} variant="link" className="icon-right">
                    <i className={showConfirmPassword ? 'icon-visibility' : 'icon-visibility-off'}></i>
                  </Button>
                </InputGroup>
                {errors.sConfirmPassword && <Form.Control.Feedback type="invalid">{errors.sConfirmPassword.message}</Form.Control.Feedback>}
              </Form.Group>
            </Col>
            <Col lg={12} className="d-flex align-items-center">
              <div className="top-d-button">
                <Button variant="primary" className="me-2" type="submit" disabled={isLoading}>
                  Submit {isLoading && <Spinner animation="border" size="sm" />}
                </Button>
                <Button variant="secondary" disabled={isLoading} onClick={() => navigate(route.dashboard)}>
                  Cancel
                </Button>
              </div>
            </Col>
          </Form>
        </Wrapper>
      </Col>
    </Row>
  )
}
