import React from 'react'
import { Form } from 'react-bootstrap'
import { Controller, useForm } from 'react-hook-form'
import { eTransactionStatusFilter, eTransactionTypeFilter } from 'shared/constants/tableHeaders'
import ReactSelect from 'react-select'

const TransactionFilter = ({ defaultValue, setRequestParams }) => {
    const { control, reset } = useForm({})

    return (
        <>
            <Form className='filter' autoComplete='off'>
                <Form.Group className='form-group m-0'>
                    <Controller
                        name='eMode'
                        control={control}
                        render={({ field: { onChange, value, ref } }) => (
                            <ReactSelect
                                ref={ref}
                                value={value}
                                options={eTransactionTypeFilter}
                                className='react-select-container transaction-filter'
                                classNamePrefix="react-select"
                                closeMenuOnSelect={true}
                                isClearable={true}
                                placeholder='Transaction Mode'
                                onChange={(e) => {
                                    setRequestParams({
                                        ...defaultValue, eMode: e?.value || "", pageNumber: 1,
                                        start: 0,
                                        limit: 10,
                                        search: "",
                                        sort: ""
                                    })
                                    onChange(e)
                                }}
                            />
                        )}
                    />
                </Form.Group>
            </Form>
            <Form className='filter' autoComplete='off'>
                <Form.Group className='form-group m-0'>
                    <Controller
                        name='eStatus'
                        control={control}
                        render={({ field: { onChange, value, ref } }) => (
                            <ReactSelect
                                ref={ref}
                                value={value}
                                options={eTransactionStatusFilter}
                                className='react-select-container transaction-filter'
                                classNamePrefix="react-select"
                                closeMenuOnSelect={true}
                                isClearable={true}
                                placeholder='Transaction Status'
                                onChange={(e) => {
                                    setRequestParams({
                                        ...defaultValue, eStatus: e?.value || "", pageNumber: 1,
                                        start: 0,
                                        limit: 10,
                                        search: "",
                                        sort: ""
                                    })
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