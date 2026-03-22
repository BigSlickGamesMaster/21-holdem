/* eslint-disable no-unsafe-optional-chaining */
/* eslint-disable no-unused-vars */
import { faCamera, faFloppyDisk, faInfoCircle, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getSetting, updateSetting } from 'query/settings/settings.query'
import React, { useEffect, useRef, useState } from 'react'
import { Button, Col, Form, Row, Spinner } from 'react-bootstrap'
import { Controller, useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import CommonInput from 'shared/components/CommonInput'
import Wrapper from 'shared/components/Wrapper'
import Select from 'react-select'
import { URL_REGEX } from 'shared/constants'
import { useNavigate } from 'react-router-dom'
import { ReactToastify } from 'shared/utils'
import { route } from 'shared/constants/AllRoutes'
import CustomModal from 'shared/components/Modal'
import { getDirtyFormValues } from 'helper/helper'
import myAxios from '../../axios'
import axios from 'axios'

const eFrequencyOptions = Array.from({ length: 10 }, (_, i) => ({ name: i + 1, value: i + 1 }))

const tagOptions = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
]
const Settings = () => {
  useEffect(() => {
    document.title = 'Settings | 21 Hold-em'
  }, [])

  const query = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields },
    control,
    reset,
    watch,
    setValue,
    resetField,
  } = useForm({ mode: 'all' })

  const [payload, setPayload] = useState({})

  // GET SETTINGS
  const { isLoading, data } = useQuery('viewSettings', () => getSetting(), {
    select: data => data.data.data,
    onSuccess: response => {
      console.log('response', response)
      const { nRakeAmount, aAvatar, aDailyReward, aShop } = response
      reset({
        nRakeAmount,
        aAvatar,
        aDailyReward,
        aShop,
      })
    },
  })

  // UPDATE SETTING
  const { mutate, isLoading: editLoading } = useMutation(updateSetting, {
    onSuccess: response => {
      ReactToastify('Settings have been successfully updated.', 'success', 'created')
      query.invalidateQueries('viewSettings')
    },
    onError: error => {
      ReactToastify(error.response?.data?.message, 'error', 'created')
    },
  })

  function handleCancel() {
    const { nRakeAmount, aAvatar, aDailyReward } = data
    const resetData = {
      nRakeAmount,
      aAvatar,
    }

    // Reset daily reward amounts using the field names that match the form
    aDailyReward.forEach((amount, index) => {
      resetData[`nDailyRewardAmount${index}`] = amount
    })

    reset(resetData)
    ReactToastify('Changes have been discarded.', 'warning')
  }

  useEffect(() => {
    const isDirtyFields = {
      nRakeAmount: +watch('nRakeAmount'),
      aAvatar: watch('aAvatar'),
      aDailyReward: +watch('aDailyReward'),
      aShop: watch('aShop')?.map((item, index) => ({ nChips: watch(`nChips${index}`), nPrice: watch(`nPrice${index}`), bTag: watch(`bTag${index}`) })),
    }

    const payloadData = getDirtyFormValues(dirtyFields, isDirtyFields)
    setPayload(payloadData)
  }, [watch('nRakeAmount'), watch('aAvatar'), watch('aDailyReward'), watch('aShop')])

  const onSubmit = async data => {
    if (payload?.aShop) {
      payload.aShop = payload?.aShop?.map((item, index) => ({
        nChips: Number(data?.[`nChips${index}`]),
        nPrice: Number(data?.[`nPrice${index}`]),
        bTag: data?.[`bTag${index}`]?.value || item?.bTag || false,
      }))
    }
    console.log('payload', payload)
    mutate(payload)
  }

  return (
    <>
      <Form className="step-one" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
        <Row>
          <Col lg={4}>
            <Row>
              <Col lg={12}>
                <Wrapper className="settings">
                  <Row>
                    <Col md={4} sm={12}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`form-control ${errors?.nRakeAmount && 'error'}`}
                        name="nRakeAmount"
                        isLoading={isLoading}
                        label="Rake Amount (%) "
                        placeholder="Enter Rake Amount"
                        maxLength={3}
                        // required
                        validation={{
                          pattern: {
                            value: /^[0-9]+$/,
                            message: 'Only numbers are allowed',
                          },
                          min: {
                            value: 1,
                            message: 'Value must be greater than zero.',
                          },
                          max: {
                            value: 100,
                            message: 'Value must be less than 100.',
                          },
                          // required: {
                          //   value: true,
                          //   message: 'Chips are required',
                          // },
                        }}
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col sm={12}>
                      <Button variant="primary" type="submit" className="me-2" disabled={isLoading || editLoading || !isDirty || !payload?.nRakeAmount}>
                        {isLoading || editLoading ? (
                          <>
                            <FontAwesomeIcon icon={faFloppyDisk} fade /> Updating Changes <FontAwesomeIcon icon={faSpinner} spinPulse />
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faFloppyDisk} /> Update
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={!isDirty || !payload?.nRakeAmount}
                        onClick={() => {
                          handleCancel()
                        }}
                      >
                        Cancel
                      </Button>
                    </Col>
                  </Row>
                </Wrapper>
              </Col>
              <Col lg={12} className="mt-3">
                <Wrapper className="settings">
                  <h1 className="text-dark">Daily Reward</h1>
                  <Row>
                    {data?.aDailyReward?.map((day, index) => (
                      <Row key={index}>
                        <Col sm={6}>
                          <CommonInput
                            type="text"
                            register={register}
                            errors={errors}
                            className={`form-control ${errors?.[`nDailyReward${index}`] && 'error'}`}
                            name={`nDailyReward${index}`}
                            isLoading={isLoading}
                            label="Day Number"
                            defaultValue={index + 1}
                            disabled
                            validation={{
                              pattern: {
                                value: /^[0-9]+$/,
                                message: 'Only numbers are allowed',
                              },
                            }}
                          />
                        </Col>
                        <Col sm={6}>
                          <CommonInput
                            type="text"
                            register={register}
                            errors={errors}
                            className={`form-control ${errors?.[`nDailyRewardAmount${index}`] && 'error'}`}
                            name={`nDailyRewardAmount${index}`}
                            isLoading={isLoading}
                            label="Daily Reward"
                            placeholder="Enter Daily Reward Amount"
                            defaultValue={day}
                            onChange={e => {
                              const updatedRewards = [...data.aDailyReward]
                              updatedRewards[index] = Number(e.target.value)
                              setPayload({ ...payload, aDailyReward: updatedRewards })
                            }}
                            validation={{
                              pattern: {
                                value: /^[0-9]+$/,
                                message: 'Only numbers are allowed',
                              },
                            }}
                          />
                        </Col>
                      </Row>
                    ))}
                  </Row>
                  <Row>
                    <Col sm={12}>
                      <Button variant="primary" type="submit" className="me-2" disabled={isLoading || editLoading || !isDirty || !payload?.aDailyReward}>
                        {isLoading || editLoading ? (
                          <>
                            <FontAwesomeIcon icon={faFloppyDisk} fade /> Updating Changes <FontAwesomeIcon icon={faSpinner} spinPulse />
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faFloppyDisk} /> Update
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={!isDirty || !payload?.aDailyReward}
                        onClick={() => {
                          handleCancel()
                        }}
                      >
                        Cancel
                      </Button>
                    </Col>
                  </Row>
                </Wrapper>
              </Col>
            </Row>
          </Col>
          <Col lg={8}>
            <Wrapper className="settings">
              <h1 className="text-dark">Shop Management</h1>
              <Row>
                {data?.aShop?.map((product, index) => (
                  <Row key={index}>
                    <Col sm={4}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`form-control ${errors?.[`nChips${index}`] && 'error'}`}
                        name={`nChips${index}`}
                        isLoading={isLoading}
                        label="Chips"
                        placeholder="Enter Chips"
                        defaultValue={product?.nChips}
                        onChange={e => {
                          const updatedChips = [...data.aShop]
                          updatedChips[index] = { nChips: Number(e.target.value), nPrice: Number(watch(`nPrice${index}`)) }
                          setPayload({ aShop: updatedChips })
                        }}
                        validation={{
                          pattern: {
                            value: /^[0-9]+$/,
                            message: 'Only numbers are allowed',
                          },
                        }}
                      />
                    </Col>
                    <Col sm={4}>
                      <CommonInput
                        type="text"
                        register={register}
                        errors={errors}
                        className={`form-control ${errors?.[`nPrice${index}`] && 'error'}`}
                        name={`nPrice${index}`}
                        isLoading={isLoading}
                        label="Price"
                        placeholder="Enter Price"
                        defaultValue={product?.nPrice}
                        onChange={e => {
                          const updatedPrice = [...data.aShop]
                          updatedPrice[index] = { nChips: Number(watch(`nChips${index}`)), nPrice: Number(e.target.value) }
                          setPayload({ aShop: updatedPrice })
                        }}
                        validation={{
                          pattern: {
                            value: /^\d*\.?\d*$/,
                            message: 'Only numbers and decimals are allowed',
                          },
                        }}
                      />
                    </Col>
                    <Col sm={4}>
                      <Form.Group className="form-group">
                        <Form.Label style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#445774' }}> Status</span>
                        </Form.Label>
                        <Controller
                          name={`bTag${index}`}
                          control={control}
                          render={({ field: { onChange, value, ref } }) => (
                            <Select
                              placeholder="Select Status"
                              ref={ref}
                              options={tagOptions}
                              getOptionLabel={option => option?.label}
                              getOptionValue={option => option?.value}
                              className={`react-select border-0`}
                              classNamePrefix="select"
                              isSearchable={false}
                              defaultValue={tagOptions?.find(item => item?.value === product?.bTag)}
                              value={value}
                              onChange={e => {
                                const updatedTag = [...data.aShop]
                                updatedTag[index] = { nChips: Number(watch(`nChips${index}`)), nPrice: Number(watch(`nPrice${index}`)), bTag: e?.value }
                                setPayload({ aShop: updatedTag })
                                onChange(e)
                              }}
                            />
                          )}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                ))}
              </Row>
              <Row>
                <Col sm={12}>
                  <Button variant="primary" type="submit" className="me-2" disabled={isLoading || editLoading || !isDirty || !payload?.aShop}>
                    {isLoading || editLoading ? (
                      <>
                        <FontAwesomeIcon icon={faFloppyDisk} fade /> Updating Changes <FontAwesomeIcon icon={faSpinner} spinPulse />
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faFloppyDisk} /> Update
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!isDirty || !payload?.aShop}
                    onClick={() => {
                      handleCancel()
                    }}
                  >
                    Cancel
                  </Button>
                </Col>
              </Row>
            </Wrapper>
          </Col>
        </Row>
      </Form>
    </>
  )
}

export default Settings
