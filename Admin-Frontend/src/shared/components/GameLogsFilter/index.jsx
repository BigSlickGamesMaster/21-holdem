/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React from 'react'
import { Form } from 'react-bootstrap'
import { Controller, useForm } from 'react-hook-form'
import Select from 'react-select'

const GameLogsFilter = ({ animatedComponents, requestParams, setRequestParams }) => {
  const { control } = useForm({ mode: 'all' })

  const statusOptions = [
    { label: 'All', value: '' },
    { label: 'Public', value: 'TwentyOneHoldemPublic' },
    { label: 'Private', value: 'TwentyOneHoldemPrivate' },
  ]

  return (
    <>
      <Form className="table-filter">
        <Form.Group className="form-group">
          <Form.Label style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#445774' }}>Game Type</span>
          </Form.Label>
          <Controller
            name="eBoardType"
            control={control}
            render={({ field: { onChange, value, ref } }) => (
              <Select
                placeholder="Select type"
                ref={ref}
                options={statusOptions}
                getOptionLabel={option => option?.label}
                getOptionValue={option => option?.value}
                className={`react-select border-0`}
                classNamePrefix="select"
                isSearchable={false}
                defaultValue={statusOptions?.find(item => item?.value === requestParams?.eBoardType)}
                value={value}
                onChange={e => {
                  if (requestParams?.pageNumber > 1) {
                    setRequestParams({ ...requestParams, pageNumber: 1, eBoardType: e?.label === 'All' ? '' : e?.value })
                  } else {
                    setRequestParams({ ...requestParams, eBoardType: e?.label === 'All' ? '' : e?.value })
                  }
                  onChange(e)
                }}
              />
            )}
          />
        </Form.Group>
      </Form>
    </>
  )
}

export default GameLogsFilter
