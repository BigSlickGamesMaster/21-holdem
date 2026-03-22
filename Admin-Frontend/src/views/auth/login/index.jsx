import React, { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { login } from 'query/auth/auth.query'
import { route } from 'shared/constants/AllRoutes'
import { validationErrors } from 'shared/constants/ValidationErrors'
import { useMutation } from 'react-query'
import { EMAIL } from 'shared/constants'
import { ReactToastify } from 'shared/utils'
import logo from 'assets/images/logo/logo-main.png'

const CONSTANT = {
  DOC_TITLE: 'Login | 21 Hold-em',
  SIGN_IN: 'Sign In',
  EMAIL_ADDRESS: 'Email Address',
  PASSWORD: 'Password',
  LOGIN: 'Login',
  FORGOT_PASSWORD: 'Forgot Password ?',
}

function Login() {
  const navigate = useNavigate()

  const {
    register: fields,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: 'onSubmit' })
  const [showPassword, setShowPassword] = useState(true)

  //* LOGIN API
  const { mutate, isLoading } = useMutation(login, {
    onSuccess: response => {
      localStorage.setItem('token', response?.headers?.authorization)
      ReactToastify('Login Successfully', 'success')
      navigate(route.dashboard)
    },
    onError: error => {
      ReactToastify(error.response.data.message, 'error')
    },
  })

  const onSubmit = useCallback(data => mutate({ sEmail: data.sEmail?.toLowerCase(), sPassword: data.sPassword }), [mutate])
  const handlePasswordToggle = useCallback(() => setShowPassword(!showPassword), [showPassword])

  useEffect(() => {
    document.title = CONSTANT.DOC_TITLE
  }, [])

  return (
    <div className="login-section">
      <div className="logo-content">{/* <img className='logo' src={logo} alt='21 Hold-em' /> */}</div>
      <Form noValidate onSubmit={handleSubmit(onSubmit)} className="login-form">
        <div className="logo-content">
          <img src={logo} alt="21 Hold-em" />
        </div>
        <div className="title-b">
          <div className="d-flex align-items-center">
            <h2 className="title me-2">{CONSTANT.SIGN_IN}</h2>
          </div>
          <div className="line"></div>
        </div>
        <Form.Group className="form-group">
          <Form.Label>{CONSTANT.EMAIL_ADDRESS}</Form.Label>
          <Form.Control
            type="text"
            required
            name="sEmail"
            placeholder="Enter your email address"
            autoFocus
            className={errors.sEmail && 'error'}
            {...fields('sEmail', {
              required: { value: true, message: 'Email Address is required' },
              pattern: { value: EMAIL, message: validationErrors.email },
            })}
          />
          {errors.sEmail && <Form.Control.Feedback type="invalid">{errors.sEmail.message}</Form.Control.Feedback>}
        </Form.Group>
        <Form.Group className="form-group">
          <Form.Label>{CONSTANT.PASSWORD}</Form.Label>
          <InputGroup>
            <Form.Control
              type={showPassword ? 'password' : 'text'}
              required
              onPaste={e => {
                e.preventDefault()
                return false
              }}
              name="sPassword"
              placeholder="Enter your password"
              className={errors.sPassword && 'error'}
              {...fields('sPassword', {
                required: { value: true, message: 'Password is required' },
                onChange: e => {
                  e.target.value = e?.target?.value?.trim()
                },
              })}
            />
            <Button onClick={handlePasswordToggle} variant="link" className="icon-right">
              <i className={!showPassword ? 'icon-visibility' : 'icon-visibility-off'}></i>
            </Button>
          </InputGroup>
          {errors.sPassword && <Form.Control.Feedback type="invalid">{errors.sPassword.message}</Form.Control.Feedback>}
        </Form.Group>
        <div className="line"></div>
        <div className="login-button">
          <Button variant="primary" type="submit" disabled={isLoading}>
            {CONSTANT.LOGIN} {isLoading && <Spinner animation="border" size="sm" />}
          </Button>
          <Link to={route.forgotPassword} className="b-link">
            {CONSTANT.FORGOT_PASSWORD}
          </Link>
        </div>
      </Form>
    </div>
  )
}

export default Login
