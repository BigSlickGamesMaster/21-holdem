/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import CommonInput from 'shared/components/CommonInput'
import { validationErrors } from 'shared/constants/ValidationErrors'
import { useMutation, useQuery } from 'react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { route } from 'shared/constants/AllRoutes'
import Wrapper from 'shared/components/Wrapper'
import CommonViewInput from 'shared/components/CommonViewInput'
import { addProto, getProtoById, updateProtoById } from 'query/proto/user.proto'
import { ReactToastify } from 'shared/utils'
import { getDirtyFormValues } from 'helper/helper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

const opponentTypeList = [
  { name: 'Bot', value: 'bot' },
  { name: 'User', value: 'user' },
  { name: 'Any', value: 'any' },
]

const boardTypeList = [
  { name: 'Private', value: 'private' },
  { name: 'Time Based', value: 'cash' },
]

export default function AddProtoPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id, type } = useParams()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    reset,
    control,
    watch,
    setError,
    clearErrors,
    setValue,
  } = useForm({
    mode: 'all',
    defaultValues: {
      nMaxPlayer: null,
      aWinningAmount: '',
    },
  })

  const BOT_SEAT_CAP = { 4: 2, 6: 4, 9: 5 }

  const [formType, setFormType] = useState('Add')
  const [viewAdminData, setViewAdminData] = useState()
  const [payload, setPayload] = useState({})

  useEffect(() => {
    if (type === 'edit') {
      setFormType('Edit')
    } else if (type === 'view') {
      setFormType('View')
    }
  }, [id, type])

  // get admin by id
  useQuery('protoById', () => getProtoById(id), {
    enabled: formType === 'Edit' || formType === 'View',
    select: data => data?.data?.data,
    onSuccess: response => {
      setViewAdminData(response)

      reset({
        sName: response.sName,
        nTurnTime: response?.nTurnTime,
        nMaxPlayer: response?.nMaxPlayer,
        nMinBuyIn: response?.nMinBuyIn,
        eStatus: response?.eStatus,
        nMinBet: response?.nMinBet,
        nBigBlind: response?.nMinBet * 2,
      })
    },
  })

  // ADD PROTOTYPE
  const { mutate, isLoading } = useMutation(addProto, {
    onSuccess: response => {
      ReactToastify('Table Created Successfully.', 'success')
      navigate(route.protoManagement)
    },
    onError: err => {
      ReactToastify(err.response.data.message, 'error')
    },
  })

  // UPDATE PROTOTYPE
  const { mutate: mutateEdit, isLoading: editLoading } = useMutation(updateProtoById, {
    onSuccess: response => {
      ReactToastify('Table Updated Successfully', 'success')
      navigate(route.protoManagement, { state: { updatedTableLocation: location?.state?.pageNumber } })
    },
    onError: err => {
      ReactToastify(err.response.data.message, 'error')
    },
  })

  useEffect(() => {
    if (type === 'edit') {
      const isDirtyFields = {
        sName: watch('sName'),
        nMaxPlayer: +watch('nMaxPlayer'),
        nTurnTime: +watch('nTurnTime'),
        nMinBuyIn: +watch('nMinBuyIn'),
        nMinBet: +watch('nMinBet'),
      }

      const payloadData = getDirtyFormValues(dirtyFields, isDirtyFields)
      setPayload(payloadData)
    }
  }, [type === 'edit', watch('sName'), watch('nMaxPlayer'), watch('nTurnTime'), watch('nMinBuyIn'), watch('nMaxTableAmount'), watch('nMinBet'), watch('eStatus')])

  function onSubmit(data) {
    if (formType === 'Edit') {
      const updateData = {
        ...(payload?.sName && { sName: data?.sName }),
        ...(payload?.nMaxPlayer && { nMaxPlayer: +data?.nMaxPlayer }),
        nMinBuyIn: +data?.nMinBuyIn,
        nMinBet: +data?.nMinBet,
      }

      if (payload?.nMinBuyIn) {
        mutateEdit({ id, ...updateData })
      } else {
        mutateEdit({ id, ...payload })
      }
    } else {
      mutate({
        sName: data?.sName,
        nMaxPlayer: +data?.nMaxPlayer,
        nTurnTime: +data?.nTurnTime,
        nMinBuyIn: +data?.nMinBuyIn,
        nMinBet: data?.nMinBet,
        nBigBlind: data?.nBigBlind,
      })
    }
  }

  useEffect(() => {
    document.title =
      type === 'edit' ? 'Edit Table | Table Management | 21 Hold-em' : type === 'view' ? 'View Table | Table Management | 21 Hold-em' : 'Add Table | Table Management | 21 Hold-em'
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
                      {formType === 'View' ? (
                        <CommonViewInput type="text" label="Name" value={viewAdminData?.sName} disabled />
                      ) : (
                        <CommonInput
                          type="text"
                          register={register}
                          errors={errors}
                          name="sName"
                          label="Name"
                          required
                          placeholder="Enter Table Name"
                          className={`form-control ${errors?.sName && 'error'}`}
                          validation={{
                            required: {
                              value: true,
                              message: 'Table name is required',
                            },
                            maxLength: {
                              value: 20,
                              message: validationErrors.rangeLength(2, 20),
                            },
                            minLength: {
                              value: 2,
                              message: validationErrors.rangeLength(2, 20),
                            },
                          }}
                        />
                      )}
                    </Col>

                    <Col sm={6}>
                      {formType === 'View' ? (
                        <CommonViewInput type="text" label="Max. Players" value={viewAdminData?.nMaxPlayer} disabled />
                      ) : (
                        <Form.Group className='form-group w-100'>
                          <Form.Label>Max. Players <span className='inputStar'>*</span></Form.Label>
                          <Form.Select
                            className={`form-control ${errors?.nMaxPlayer ? 'error' : ''}`}
                            {...register('nMaxPlayer', {
                              required: { value: true, message: 'Max player is required' },
                            })}
                          >
                            <option value=''>Select player count</option>
                            <option value='4'>4 Players</option>
                            <option value='6'>6 Players</option>
                            <option value='9'>9 Players</option>
                          </Form.Select>
                          {errors?.nMaxPlayer && (
                            <Form.Control.Feedback type='invalid'>{errors.nMaxPlayer.message}</Form.Control.Feedback>
                          )}
                        </Form.Group>
                      )}
                    </Col>

                    <Col sm={6}>
                      <CommonViewInput
                        type='text'
                        label='Bot Count'
                        value={(() => {
                          const n = formType === 'View' ? viewAdminData?.nMaxPlayer : +watch('nMaxPlayer')
                          return n ? BOT_SEAT_CAP[n] ?? '—' : '—'
                        })()}
                        disabled
                      />
                    </Col>

                    <Col sm={6}>
                      {formType === 'View' ? (
                        <CommonViewInput type="text" label="Min. Buy In" value={viewAdminData?.nMinBuyIn} disabled />
                      ) : (
                        <CommonInput
                          type="text"
                          register={register}
                          errors={errors}
                          className={`form-control ${errors?.nMinBuyIn && 'error'}`}
                          name="nMinBuyIn"
                          label="Min. Buy In"
                          placeholder="Enter Min Buy In"
                          required
                          // onChange={e => {
                          //   setValue('nMinBet', Number(e.target.value))
                          //   setValue('nSmallBlind', Number(e.target.value) / 5)
                          //   setValue('nBigBlind', (Number(e.target.value) / 5) * 2)
                          // }}
                          validation={{
                            pattern: {
                              value: /^[0-9]+$/,
                              message: 'Only numbers are allowed',
                            },
                            required: {
                              value: true,
                              message: 'Min buy in is required',
                            },
                          }}
                        />
                      )}
                    </Col>

                    <Col sm={6}>
                      {formType === 'View' ? (
                        <CommonViewInput type="text" label="Small Blind" value={watch('nMinBet')} disabled />
                      ) : (
                        <CommonInput
                          type="text"
                          register={register}
                          errors={errors}
                          className={`form-control ${errors?.nMinBet && 'error'}`}
                          name="nMinBet"
                          label="Small Blind"
                          placeholder="Enter Small Blind"
                          required
                          onChange={e => {
                            const value = Number(e.target.value)
                            setValue('nBigBlind', value ? value * 2 : 0)
                          }}
                          validation={{
                            pattern: {
                              value: /^[0-9]+$/,
                              message: 'Only numbers are allowed',
                            },
                            required: {
                              value: true,
                              message: 'Small Blind is required',
                            },
                            validate: value => {
                              if (Number(value) > Number(watch('nMinBuyIn'))) {
                                return 'Small Blind must be less than Min buy in.'
                              }
                              return true
                            },
                          }}
                        />
                      )}
                    </Col>

                    <Col sm={6}>
                      {formType === 'View' ? (
                        <CommonViewInput type="text" label="Big Blind" value={watch('nBigBlind')} disabled />
                      ) : (
                        <CommonInput
                          type="text"
                          register={register}
                          errors={errors}
                          className={`form-control`}
                          name="nBigBlind"
                          label="Big Blind"
                          placeholder="Enter Big Blind"
                          defaultValue={watch('nSmallBlind') !== undefined ? Number(watch('nSmallBlind')) * 2 : 0}
                          disabled
                        />
                      )}
                    </Col>

                    <Col sm={6}>
                      {formType === 'View' ? (
                        <CommonViewInput type="text" label="Turn Time" value={viewAdminData?.nTurnTime} disabled subLabel="(in seconds)" />
                      ) : (
                        <CommonInput
                          type="text"
                          subLabel="(in seconds)"
                          register={register}
                          errors={errors}
                          className={`form-control ${errors?.nTurnTime && 'error'}`}
                          name="nTurnTime"
                          label="Turn Time"
                          placeholder="Enter Turn Time"
                          required
                          validation={{
                            pattern: {
                              value: /^[0-9]+$/,
                              message: 'Only numbers are allowed',
                            },
                            required: {
                              value: true,
                              message: 'Turn time duration is required',
                            },
                            min: {
                              value: 1,
                              message: 'Turn time must be greater than 0',
                            },
                          }}
                        />
                      )}
                    </Col>

                    <Row>
                      <Col sm={12}>
                        {formType === 'View' ? (
                          <></>
                        ) : (
                          <Button variant="primary" type="submit" className="me-2" disabled={type === 'edit' ? isLoading || !isDirty : isLoading}>
                            {isLoading || editLoading ? (
                              formType === 'Edit' ? (
                                <>
                                  Updating Table <FontAwesomeIcon icon={faSpinner} spinPulse />
                                </>
                              ) : (
                                <>
                                  Creating Table <FontAwesomeIcon icon={faSpinner} spinPulse />
                                </>
                              )
                            ) : formType === 'Edit' ? (
                              'Update Table'
                            ) : (
                              'create Table'
                            )}
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          disabled={isLoading}
                          onClick={() => navigate(route.protoManagement, { state: { updatedTableLocation: location?.state?.pageNumber } })}
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
