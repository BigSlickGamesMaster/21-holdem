import React, { useEffect, useRef, useState } from 'react'
import { Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { PASSWORD } from 'shared/constants'
import { validationErrors } from 'shared/constants/ValidationErrors'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { checkToken, resetPassWord } from 'query/auth/auth.query'
import { useNavigate, useParams } from 'react-router-dom'
// import { checkToken } from 'query/profile/profile.query'
// import { Loader } from 'shared/components/Loader'
import { ReactToastify } from 'shared/utils'
import { route } from 'shared/constants/AllRoutes'
import logo from 'assets/images/logo/logo-main.png'

const CONSTANT = {
  DOC_TITLE: 'Reset Password | 21 Hold-em',
  RESET_PASSWORD: 'Reset Password',
  NEW_PASSWORD: 'New Password',
  CONFIRM_PASSWORD: 'Confirm Password',
  RESET_PASSWORD_MESSAGE: 'Enter your new password',
  RESET: 'Reset',
  LOGIN: 'Login',
}

function ResetPassword() {
  const navigate = useNavigate()
  const { token } = useParams()
  const query = useQueryClient()

  const sNewPassword = useRef({})
  const [tokneWrong, setTokenWrong] = useState(false)
  const [showPassword, setShowPassword] = useState({ newPassword: true, confirmPassword: true })

  //* CHECK TOKEN API
  const { data: tokenData, error: tokenError } = useQuery(['checkToken'], () => checkToken(token), {
    onSuccess: () => {
      console.log(tokenData)
    },
    onError: () => {
      setTokenWrong(true)
    },
  })

  //* RESET PASSWORD API
  const { mutate, isLoading } = useMutation(resetPassWord, {
    onSuccess: response => {
      navigate('/login')
      ReactToastify(response?.data?.message, 'success')
    },
    onError: err => {
      if (err?.response?.data?.message?.includes('Token expired')) {
        setTokenWrong(true)
      }
      ReactToastify(err?.response?.data?.message, 'error')
    },
  })

  const {
    register: fields,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ mode: 'onTouched' })
  sNewPassword.current = watch('sNewPassword')

  function handlePasswordToggle(name) {
    if (name === 'newPassword') {
      setShowPassword({ ...showPassword, newPassword: !showPassword.newPassword })
    } else {
      setShowPassword({ ...showPassword, confirmPassword: !showPassword.confirmPassword })
    }
  }

  const onSubmit = data => {
    query.invalidateQueries('checkToken')

    if (tokneWrong) {
      setTokenWrong(true)
    } else {
      mutate({ sNewPassword: data.sConfirmNewPassword, token })
    }
  }

  useEffect(() => {
    document.title = CONSTANT.DOC_TITLE
  }, [])

  return (
    <div className="login-section">
      <div className="logo-content">{/* <img className='logo' src={logo} alt='21 Hold-em' /> */}</div>
      <Form noValidate onSubmit={handleSubmit(onSubmit)} className="login-form">
        <>
          <div className="logo-content">
            <img src={logo} alt="21 Hold-em" />
          </div>
          <div className="title-b">
            <div className="d-flex align-items-center">
              <h3 className="m-0 title me-2">{CONSTANT.RESET_PASSWORD}</h3>
            </div>
            <div className="line"></div>
          </div>
          {tokneWrong ? (
            <div className="reset_expire">
              <h5>{tokenError?.response?.data?.message}</h5>
              <div className="goBackBtn">
                <Button variant="primary" onClick={() => navigate(route?.login)} disabled={isLoading}>
                  {CONSTANT.LOGIN} {isLoading && <Spinner animation="border" size="sm" />}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Form.Group className="form-group">
                <Form.Label>{CONSTANT.NEW_PASSWORD}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPassword.newPassword ? 'password' : 'text'}
                    required
                    name="sNewPassword"
                    onPaste={e => {
                      e.preventDefault()
                      return false
                    }}
                    placeholder="Enter your new password"
                    className={errors.sNewPassword && 'error'}
                    {...fields('sNewPassword', {
                      required: 'New Password is required',
                      pattern: {
                        value: PASSWORD,
                        message: validationErrors.passwordRegEx,
                      },
                      maxLength: { value: 15, message: validationErrors.rangeLength(8, 15) },
                      minLength: { value: 8, message: validationErrors.rangeLength(8, 15) },
                      onChange: e => {
                        e.target.value = e?.target?.value?.trim()
                      },
                    })}
                  />
                  <Button onClick={() => handlePasswordToggle('newPassword')} variant="link" className="icon-right">
                    <i className={showPassword.newPassword ? 'icon-visibility' : 'icon-visibility-off'}></i>
                  </Button>
                </InputGroup>
                {errors.sNewPassword && <Form.Control.Feedback type="invalid">{errors.sNewPassword.message}</Form.Control.Feedback>}
              </Form.Group>

              <Form.Group className="form-group">
                <Form.Label>{CONSTANT.CONFIRM_PASSWORD}</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPassword.confirmPassword ? 'password' : 'text'}
                    required
                    name="sConfirmNewPassword"
                    onPaste={e => {
                      e.preventDefault()
                      return false
                    }}
                    placeholder="Enter same new password"
                    className={errors.sConfirmNewPassword && 'error'}
                    {...fields('sConfirmNewPassword', {
                      required: 'Confrm Password is required',
                      validate: value => value === sNewPassword.current || validationErrors.passwordNotMatch,
                      onChange: e => {
                        e.target.value = e?.target?.value?.trim()
                      },
                    })}
                  />
                  <Button onClick={() => handlePasswordToggle('confirmPassword')} variant="link" className="icon-right">
                    <i className={showPassword.confirmPassword ? 'icon-visibility' : 'icon-visibility-off'}></i>
                  </Button>
                </InputGroup>
                {errors.sConfirmNewPassword && <Form.Control.Feedback type="invalid">{errors.sConfirmNewPassword.message}</Form.Control.Feedback>}
              </Form.Group>
              <div className="line"></div>
              <div className="login-button">
                <Button variant="primary" type="submit" disabled={isLoading}>
                  {CONSTANT.RESET} {isLoading && <Spinner animation="border" size="sm" />}
                </Button>
              </div>
            </>
          )}
        </>
      </Form>
    </div>
  )
}
export default ResetPassword
