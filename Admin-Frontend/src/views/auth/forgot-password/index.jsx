import React, { useCallback, useEffect } from 'react'
import { Button, Form, Spinner } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { useMutation } from 'react-query'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPassword } from 'query/auth/auth.query'
import { EMAIL } from 'shared/constants'
import { validationErrors } from 'shared/constants/ValidationErrors'
import { route } from 'shared/constants/AllRoutes'
import { ReactToastify } from 'shared/utils'
import logo from 'assets/images/logo/logo-main.png'

const CONSTANT = {
  FORGOT_PASSWORD: 'Forget Password ?',
  FORGOT_PASSWORD_MESSAGE: 'Forgot your password? No worries! Submit your registered email ID and we will send you a link to Reset Password.',
  SUBMIT_BUTTON: 'Submit',
  BACK_TO_LOGIN_BUTTON: 'Back to Login',
  DOC_TITLE: 'Forgot Password | 21 Hold-em',
}

function ForgotPassword() {
  const navigate = useNavigate()

  const {
    register: fields,
    handleSubmit,
    formState: { errors },
  } = useForm({ mode: 'onSubmit' })

  //* FORGOT PASSWORD API
  const { mutate, isLoading } = useMutation(forgotPassword, {
    onSuccess: response => {
      navigate(route.login)
      ReactToastify(response?.data?.message, 'success')
    },
    onError: err => {
      ReactToastify(err?.response?.data?.message, 'error')
    },
  })

  const onSubmit = useCallback(data => mutate({ sEmail: data?.sEmail }), [mutate])

  useEffect(() => {
    document.title = CONSTANT.DOC_TITLE
  }, [])
  return (
    <div className="login-section">
      <div className="logo-content">{/* <img className='logo' src={logo} alt='21 Hold-em' /> */}</div>
      <Form noValidate className="login-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="logo-content">
          <img src={logo} alt="21 Hold-em" />
        </div>
        <div className="title-b">
          <div className="d-flex align-items-center">
            <h2 className="title me-2 m-0">{CONSTANT.FORGOT_PASSWORD}</h2>
          </div>
          <div className="line"></div>
          <p>{CONSTANT.FORGOT_PASSWORD_MESSAGE}</p>
        </div>
        <Form.Group className="form-group">
          <Form.Label>Email Address</Form.Label>
          <Form.Control
            type="text"
            required
            placeholder="Enter your email address"
            name="sEmail"
            className={errors.sEmail && 'error'}
            {...fields('sEmail', {
              required: { value: true, message: 'Email Address is required' },
              pattern: { value: EMAIL, message: validationErrors.email },
            })}
          />
          {errors.sEmail && <Form.Control.Feedback type="invalid">{errors.sEmail.message}</Form.Control.Feedback>}
        </Form.Group>
        <div className="line"></div>
        <div className="login-button">
          <Button variant="primary" type="submit" disabled={isLoading}>
            {CONSTANT.SUBMIT_BUTTON} {isLoading && <Spinner animation="border" size="sm" />}
          </Button>
          <Link to={'/login'} className="b-link">
            {' '}
            {CONSTANT.BACK_TO_LOGIN_BUTTON}{' '}
          </Link>
        </div>
      </Form>
    </div>
  )
}

export default ForgotPassword
