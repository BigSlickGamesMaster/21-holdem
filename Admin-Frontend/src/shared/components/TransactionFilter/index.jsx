/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React from 'react'
import { Form } from 'react-bootstrap'
import { Controller, useForm } from 'react-hook-form'
import Select from 'react-select'

const TransactionFilter = ({ animatedComponents, requestParams, setRequestParams }) => {
    const { control } = useForm({ mode: 'all' })

    const statusOptions = [
        { label: 'All', value: '' },
        { label: 'Success', value: 'Success' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Failed', value: 'Failed' },
    ]

    return (
        <>
            <Form className='table-filter'>
                <Form.Group className="form-group">
                    <Form.Label style={{ display: "flex", justifyContent: "space-between", }} >
                        <span style={{ color: "#445774" }}> Status</span>
                    </Form.Label>
                    <Controller
                        name="eStatus"
                        control={control}
                        render={({ field: { onChange, value, ref } }) => (
                            <Select
                                placeholder="Select Status"
                                ref={ref}
                                options={statusOptions}
                                getOptionLabel={(option) => option?.label}
                                getOptionValue={(option) => option?.value}
                                className={`react-select border-0`}
                                classNamePrefix="select"
                                isSearchable={false}
                                defaultValue={statusOptions?.find(item => item?.value === requestParams?.eStatus)}
                                value={value}
                                onChange={(e) => {
                                    setRequestParams({ ...requestParams, eStatus: e?.label === 'All' ? '' : e?.value })
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

export default TransactionFilter
