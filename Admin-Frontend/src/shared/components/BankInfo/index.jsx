/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react'
import { Button, Col, Form, Row, Spinner } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import CommonInput from 'shared/components/CommonInput'
import { useMutation, useQueryClient } from 'react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { route } from 'shared/constants/AllRoutes'
import { addUser, updateUserById } from 'query/user/user.query'
import CustomModal from '../Modal'
import { ReactToastify } from 'shared/utils'
import Wrapper from '../Wrapper'

export default function BankInfo ({ bank }) {
    const query = useQueryClient()
    const navigate = useNavigate()
    const { id } = useParams()

    const { oBank } = bank

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch
    } = useForm({ mode: 'all' })

    useEffect(() => {
        if (oBank) {
            reset({
                "sBankName": oBank?.sBankName,
                "sBranchName": oBank?.sBranchName,
                "sAccountNo": oBank?.sAccountNo,
                "sIFSC": oBank?.sIFSC,
                "sAccountHolderName": oBank?.sAccountHolderName,
            })
        }
    }, [oBank, reset])

    // const { mutate, isLoading } = useMutation(addUserBank, {
    //     onSuccess: (response) => {
    //         ReactToastify(userData?.oBanking ? 'User Bank Details Updated Successfully.' : 'User Bank Details Added Successfully.', 'success')
    //         query.invalidateQueries('userDataById')
    //         // navigate(route.userInfo)
    //     }
    // })


    function onSubmit (data) {
        if (Object?.keys(oBank)?.length > 0) {
            //^ CREATE LOGIC

        } else {
            //^ UPDATE LOGIC
            // mutate({ ...data, iUserId: id })
        }
    }

    return (
        <>
            <Form
                className='step-one'
                autoComplete='off'
                onSubmit={handleSubmit(onSubmit)}
            >
                <div className='personal-details'>
                    <div className='user-form'>
                        <Row>
                            <Col xxl={6}>
                                <Wrapper>
                                    <div className='wrapper-title'>Bank Details</div>
                                    <hr />
                                    <Row>
                                        <Col sm={6}>
                                            <CommonInput
                                                type='text'
                                                register={register}
                                                errors={errors}
                                                className={`form-control ${errors?.sBankName && 'error'}`}
                                                name='sBankName'
                                                label='Bank Name'
                                                disabled
                                                placeholder='Enter bank name'
                                                required
                                                onChange={(e) => {
                                                    e.target.value =
                                                        e.target.value?.trim() &&
                                                        e.target.value.replace(/^[0-9]+$/g, '')
                                                }}
                                                validation={{
                                                    required: {
                                                        value: true,
                                                        message: "Bank name is required"
                                                    }
                                                }}
                                            />
                                        </Col>

                                        <Col sm={6}>
                                            <CommonInput
                                                type='text'
                                                register={register}
                                                errors={errors}
                                                className={`form-control ${errors?.sBranchName && 'error'}`}
                                                name='sBranchName'
                                                label='Branch Name'
                                                placeholder='Enter branch name'
                                                disabled
                                                required
                                                onChange={(e) => {
                                                    e.target.value =
                                                        e.target.value?.trim() &&
                                                        e.target.value.replace(/^[0-9]+$/g, '')
                                                }}
                                                validation={{
                                                    required: {
                                                        value: true,
                                                        message: "Branch name is required"
                                                    }
                                                }}
                                            />
                                        </Col>

                                        <Col sm={12}>
                                            <CommonInput
                                                type='text'
                                                register={register}
                                                errors={errors}
                                                className={`form-control ${errors?.sAccountHolderName && 'error'}`}
                                                name='sAccountHolderName'
                                                label='Account Holder Name'
                                                disabled
                                                placeholder='Enter holder name'
                                                required
                                                onChange={(e) => {
                                                    e.target.value =
                                                        e.target.value?.trim() &&
                                                        e.target.value.replace(/^[0-9]+$/g, '')
                                                }}
                                                validation={{
                                                    required: {
                                                        value: true,
                                                        message: 'Holder name is required'
                                                    }
                                                }}
                                            />
                                        </Col>

                                        <Col sm={8}>
                                            <CommonInput
                                                type='text'
                                                register={register}
                                                errors={errors}
                                                className={`for m-control ${errors?.sAccountNo && 'error'}`}
                                                name='sAccountNo'
                                                label='Account NO.'
                                                disabled
                                                placeholder='Enter account number'
                                                required
                                                validation={{
                                                    pattern: {
                                                        value: /^[0-9]+$/,
                                                        message: 'Only numbers are allowed'
                                                    },
                                                    required: {
                                                        value: true,
                                                        message: 'Account number is required'
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    e.target.value =
                                                        e.target.value?.trim() &&
                                                        e.target.value.replace(/^[a-zA-z]+$/g, '')
                                                }}
                                            />
                                        </Col>

                                        <Col sm={4}>
                                            <CommonInput
                                                type='text'
                                                register={register}
                                                errors={errors}
                                                className={`for m-control ${errors?.sIFSC && 'error'}`}
                                                name='sIFSC'
                                                label='IFSC Code'
                                                disabled
                                                placeholder='eg: ABCD0EFG111'
                                                required
                                                validation={{
                                                    pattern: {
                                                        value: /^[A-Z]{4}0[A-Z0-9]{6}$/,
                                                        message: 'Invalid IFSC code'
                                                    },
                                                    required: {
                                                        value: true,
                                                        message: 'IFSC code is required'
                                                    }
                                                }}
                                                onChange={(e) => {
                                                    e.target.value =
                                                        e.target.value.toUpperCase().trim().slice(0, 11)
                                                }}
                                            />
                                        </Col>


                                        {/* <Row>
                                            <Col sm={12}>
                                                <Button
                                                    variant='secondary'
                                                    className='me-2'
                                                    disabled={isLoading}
                                                    onClick={() => navigate(route.userInfo)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant='primary'
                                                    type='submit'
                                                disabled={isLoading}
                                                >
                                                    {bank?.oBanking ? "Update Bank details" : "Add Bank details"}
                                                    {isLoading && (
                                                        <Spinner animation='border' size='sm' />
                                                    )}
                                                </Button>
                                            </Col>
                                        </Row> */}
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
