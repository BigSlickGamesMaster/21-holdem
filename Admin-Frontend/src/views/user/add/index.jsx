/* eslint-disable no-unused-vars */
import React, { useEffect } from 'react'
import { Button, Col, Form, Row, Spinner } from 'react-bootstrap'
import { Controller, useForm } from 'react-hook-form'
import CommonInput from 'shared/components/CommonInput'
import { validationErrors } from 'shared/constants/ValidationErrors'
import Select from 'react-select'
import { useMutation } from 'react-query'
import { useNavigate } from 'react-router-dom'
import { route } from 'shared/constants/AllRoutes'
import Wrapper from 'shared/components/Wrapper'
import { addUser } from 'query/user/user.query'
import { ReactToastify } from 'shared/utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

export default function AddUserPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    clearErrors,
  } = useForm({ mode: 'all' })

  // CREATE USER
  const { mutate, isLoading } = useMutation(addUser, {
    onSuccess: response => {
      ReactToastify('User Created Successfully.', 'success', 'created')
      navigate(route.userManagement)
    },
    onError: error => {
      ReactToastify(error.response?.data?.message, 'error', 'created')
    },
  })

  function onSubmit(data) {
    mutate({
      sEmail: data.sEmail,
      sUserName: data.sUserName,
      // sMobile: data.sMobile,
      nChips: data?.nChips,
      eGender: data?.eGender?.value,
      sPassword: data?.sPassword,
      eUserType: 'user',
    })
  }

  useEffect(() => {
    document.title = 'Add User | User Management | 21 Hold-em'
  }, [])

  function generatePassword() {
    // Ensure one of each required character type
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    const lower = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    const number = '0123456789'[Math.floor(Math.random() * 10)]
    const special = '@$!%*?&'[Math.floor(Math.random() * 7)]

    // Start with required characters
    let password = upper + lower + number + special

    // Add additional random characters to reach desired length (8)
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&'
    const remainingLength = 8 - password.length

    for (let i = 0; i < remainingLength; i++) {
      password += chars[Math.floor(Math.random() * chars.length)]
    }

    // Shuffle the password to avoid predictable patterns
    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('')

    setValue('sPassword', password)
    clearErrors('sPassword')
  }

  return (
    <>
      <Form className="step-one add-user-form" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
        <div className="personal-details">
          <div className="user-form">
            <Row>
              <Col xxl={8}>
                <Wrapper>
                  <Row>
                    <Col sm={6}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        name="sUserName"
                        label="Username"
                        required
                        placeholder="Enter Username"
                        className={`form-control ${errors?.sUserName && 'error'}`}
                        isLoading={isLoading}
                        validation={{
                          required: {
                            value: true,
                            message: 'Username is required',
                          },
                          // maxLength: {
                          //   value: 20,
                          //   message: validationErrors.rangeLength(2, 20),
                          // },
                          // minLength: {
                          //   value: 2,
                          //   message: validationErrors.rangeLength(2, 20),
                          // },
                          // pattern: {
                          //   value: /^[a-zA-Z0-9 ]+$/,
                          //   message: 'Special characters and spaces are not allowed',
                          // },
                        }}
                      />
                    </Col>
                    <Col sm={6}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`form-control ${errors?.sEmail && 'error'}`}
                        name="sEmail"
                        isLoading={isLoading}
                        label="Email Address"
                        placeholder="Enter Email Address"
                        required
                        validation={{
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: validationErrors.email,
                          },
                          required: {
                            value: true,
                            message: 'Email Address is required',
                          },
                        }}
                      />
                    </Col>
                    <Col sm={6}>
                      <div className="password-row">
                        <CommonInput
                          type="text"
                          register={register}
                          errors={errors}
                          className={`form-control input-password ${errors?.sPassword && 'error'}`}
                          name="sPassword"
                          isLoading={isLoading}
                          label="Password"
                          maxLength={10}
                          placeholder="Enter Password"
                          required
                          validation={{
                            pattern: {
                              value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                              message:
                                'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
                            },
                            required: {
                              value: true,
                              message: 'Password is required',
                            },
                          }}
                        />

                        <Button variant="primary" className="mt-2 icon-right square" onClick={generatePassword}>
                          Generate
                        </Button>
                      </div>
                    </Col>

                    {/* <Col sm={6}>
                      <Form.Group className="form-group">
                        <Form.Label style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#445774' }}>
                            Gender <span style={{ color: '#E56F70' }}>*</span>
                          </span>
                        </Form.Label>
                        <Controller
                          name="eGender"
                          control={control}
                          rules={{
                            required: {
                              value: true,
                              message: 'Gender is required',
                            },
                          }}
                          render={({ field: { onChange, value, ref } }) => (
                            <Select
                              placeholder="Select Gender"
                              ref={ref}
                              options={[
                                { name: 'Male', value: 'male' },
                                { name: 'Female', value: 'female' },
                              ]}
                              isLoading={isLoading}
                              getOptionLabel={option => option?.name}
                              getOptionValue={option => option?.value}
                              className={`react-select border-0 ${errors.eGender && 'error'}`}
                              classNamePrefix="select"
                              isSearchable={false}
                              value={value}
                              onChange={onChange}
                            />
                          )}
                        />
                        {errors.eGender && <Form.Control.Feedback type="invalid">{errors.eGender.message}</Form.Control.Feedback>}
                      </Form.Group>
                    </Col> */}
                    {/* <Col sm={6}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`form-control ${errors?.sMobile && 'error'}`}
                        name="sMobile"
                        isLoading={isLoading}
                        label="Mobile Number"
                        maxLength={10}
                        placeholder="Enter Mobile Number"
                        required
                        validation={{
                          pattern: {
                            // value: /^\+?[6-9][0-9]{8,12}$/,
                            value: /^[0-9]+$/,
                            message: 'Invalid Mobile Number',
                          },
                          required: {
                            value: true,
                            message: 'Mobile Number is required',
                          },
                        }}
                      />
                    </Col> */}

                    <Col sm={6}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`form-control ${errors?.nChips && 'error'}`}
                        name="nChips"
                        isLoading={isLoading}
                        label="Chips"
                        placeholder="Enter Chips"
                        maxLength={4}
                        // required
                        validation={{
                          pattern: {
                            value: /^[0-9]+$/,
                            message: 'Only numbers are allowed',
                          },
                          // required: {
                          //   value: true,
                          //   message: 'Chips are required',
                          // },
                        }}
                      />
                    </Col>

                    <Row>
                      <Col sm={12}>
                        <Button variant="primary" type="submit" className="me-2" disabled={isLoading}>
                          {/* Create User */}
                          {isLoading ? (
                            <>
                              Creating User <FontAwesomeIcon icon={faSpinner} spinPulse />
                            </>
                          ) : (
                            'Create User'
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={isLoading}
                          onClick={() => {
                            navigate(route.userManagement)
                          }}
                        >
                          Cancel
                        </Button>
                      </Col>
                    </Row>
                  </Row>
                </Wrapper>
              </Col>
            </Row>
          </div>
        </div>
      </Form>
    </>
  )
}
