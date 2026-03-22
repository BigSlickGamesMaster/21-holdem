/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react'
import { Button, Col, Form, Row, Spinner } from 'react-bootstrap'
import { Controller, useForm } from 'react-hook-form'
import CommonInput from 'shared/components/CommonInput'
import { validationErrors } from 'shared/constants/ValidationErrors'
import Select from 'react-select'
import { useMutation, useQuery } from 'react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { route } from 'shared/constants/AllRoutes'
import Wrapper from 'shared/components/Wrapper'
import { getUserById, updateUserById } from 'query/user/user.query'
import { genderList } from 'shared/constants/TableHeaders'
import { ReactToastify } from 'shared/utils'
import { getDirtyFormValues } from 'helper/helper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { EMAIL } from 'shared/constants'

export default function EditUserPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    reset,
    control,
    watch,
  } = useForm({ mode: 'all' })

  const [payload, setPayload] = useState([])

  //* GET SPECIFIC USER
  const { isLoading: getLoading, isFetching: fetchLoading } = useQuery('userByAdmin', () => getUserById(id), {
    enabled: !!id,
    select: data => data?.data?.data,
    onSuccess: response => {
      reset({
        sEmail: response?.sEmail,
        sUserName: response?.sUserName,
        sMobile: response?.sMobile,
        nChips: response?.nChips,
        eGender: genderList?.find(gender => gender.value === response?.eGender)?.name,
      })
    },
  })

  //* UPDATE USER
  const { mutate: mutateEdit, isLoading: editLoading } = useMutation(updateUserById, {
    onSuccess: response => {
      ReactToastify('User Updated Successfully.', 'success', 'updated')
      navigate(route.userManagement, { state: { updatedUserLocation: location?.state?.pageNumber } })
    },
    onError: error => {
      ReactToastify(error.response?.data?.message, 'error', 'updated')
    },
  })

  useEffect(() => {
    const isDirtyFields = {
      sEmail: watch('sEmail'),
      sUserName: watch('sUserName'),
      sMobile: watch('sMobile'),
      nChips: +watch('nChips'),
      eGender: watch('eGender')?.value,
    }

    const payloadData = getDirtyFormValues(dirtyFields, isDirtyFields)
    setPayload(payloadData)
  }, [watch('sEmail'), watch('sUserName'), watch('sMobile'), watch('nChips'), watch('eGender')])

  function onSubmit(data) {
    mutateEdit({ id, ...payload })
  }

  useEffect(() => {
    document.title = 'Edit User | User Management | 21 Hold-em'
  }, [])

  return (
    <>
      <Form className="step-one" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
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
                        isLoading={getLoading || fetchLoading}
                        validation={{
                          required: {
                            value: true,
                            message: 'Username is required',
                          },
                          maxLength: {
                            value: 20,
                            message: validationErrors.rangeLength(2, 20),
                          },
                          minLength: {
                            value: 2,
                            message: validationErrors.rangeLength(2, 20),
                          },
                          // pattern: {
                          //   value: /^[a-zA-Z ]+$/,
                          //   message: 'Special characters and numbers are not allowed',
                          // },
                        }}
                      />
                    </Col>
                    {/* <Col sm={6}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`form-control ${errors?.sEmail && 'error'}`}
                        name="sEmail"
                        isLoading={getLoading || fetchLoading}
                        label="Email Address"
                        placeholder="Enter Email Address"
                        required
                        validation={{
                          pattern: {
                            value: EMAIL,
                            message: validationErrors.email,
                          },
                          required: {
                            value: true,
                            message: 'Email Address is required',
                          },
                        }}
                      />
                    </Col> */}
                    {/* <Col sm={6}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`for m-control ${errors?.sMobile && 'error'}`}
                        name="sMobile"
                        label="Mobile Number"
                        placeholder="Enter Mobile Number"
                        disabled
                      />
                    </Col> */}

                    <Col sm={6}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`for m-control ${errors?.sEmail && 'error'}`}
                        name="sEmail"
                        label="Email Address"
                        placeholder="Enter Email Address"
                        disabled
                      />
                    </Col>
                    <Col sm={6}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`form-control ${errors?.nChips && 'error'}`}
                        name="nChips"
                        isLoading={getLoading || fetchLoading}
                        label="Chips"
                        placeholder="Enter Chips"
                        // maxLength={4}
                        required
                        validation={{
                          pattern: {
                            value: /^[0-9]+$/,
                            message: 'Only numbers are allowed',
                          },
                          required: {
                            value: true,
                            message: 'Chips are required',
                          },
                        }}
                      />
                    </Col>
                    {/* <Col sm={6}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`for m-control ${errors?.eGender && 'error'}`}
                        name="eGender"
                        label="Gender"
                        placeholder="Enter Gender"
                        disabled
                      />
                    </Col> */}

                    {/* <Col sm={6}>
                                            <Form.Group className="form-group">
                                                <Form.Label style={{ display: "flex", justifyContent: "space-between", }} >
                                                    <span style={{ color: "#445774" }}> Gender <span className="inputStar">*</span> </span>
                                                </Form.Label>
                                                <Controller
                                                    name="eGender"
                                                    control={control}
                                                    rules={{
                                                        required: {
                                                            value: true,
                                                            message: "Gender is required",
                                                        },
                                                    }}
                                                    render={({ field: { onChange, value, ref } }) => (
                                                        <Select
                                                            placeholder="Select Gender"
                                                            ref={ref}
                                                            options={genderList}
                                                            isLoading={getLoading || fetchLoading}
                                                            getOptionLabel={(option) => option?.name}
                                                            getOptionValue={(option) => option?.value}
                                                            className={`react-select border-0 ${errors.eGender && "error"}`}
                                                            classNamePrefix="select"
                                                            isSearchable={false}
                                                            value={value}
                                                            onChange={onChange}
                                                        />
                                                    )}
                                                />
                                                {errors.eGender && (
                                                    <Form.Control.Feedback type="invalid">
                                                        {errors.eGender.message}
                                                    </Form.Control.Feedback>
                                                )}
                                            </Form.Group>
                                        </Col> */}

                    <Row>
                      <Col sm={12}>
                        <Button variant="primary" type="submit" className="me-2" disabled={editLoading || !isDirty}>
                          {editLoading ? (
                            <>
                              Updating User <FontAwesomeIcon icon={faSpinner} spinPulse />
                            </>
                          ) : (
                            'Update User'
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={editLoading}
                          onClick={() => {
                            navigate(route.userManagement, { state: { updatedUserLocation: location?.state?.pageNumber } })
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
