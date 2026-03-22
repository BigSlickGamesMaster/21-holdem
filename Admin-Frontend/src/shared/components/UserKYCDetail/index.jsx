/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from 'react'
import Wrapper from '../Wrapper'
import CommonInput from '../CommonInput'
import { Controller, useForm } from 'react-hook-form'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { getDirtyFormValues, toaster } from 'helper/helper'
import { useMutation, useQueryClient } from 'react-query'
import CustomModal from '../Modal'
import CustomFileInput from '../CustomFileInput'
import CustomFileInputLabel from '../CustomFileInputLabel'
import DocumentPreview from '../DocumentPreview'
import { createKYCDetails, updateKYCDetails, updateKYCStatus } from 'query/kyc/kyc.query'
import { ReactToastify } from 'shared/utils'
import myAxios from '../../../axios'
import axios from 'axios'

const UserKYCDetail = ({ id, userKYC }) => {
    const query = useQueryClient()

    const PANInputRef = useRef(null)
    const KYCFrontInputRef = useRef(null)
    const KYCBackInputRef = useRef(null)

    const { register, handleSubmit, formState: { errors, isDirty, dirtyFields }, control, watch, reset, getValues } = useForm({ mode: 'all' })
    const { register: kycRegister, handleSubmit: kycHandleSubmit, formState: { errors: kycErrors, isDirty: kycIsDirty, dirtyFields: kycDirtyFields }, control: kycControl, watch: kycWatch, reset: resetKYC } = useForm({ mode: 'all' })

    const [modal, setModal] = useState({ open: false, type: '' })
    const [doc, setDoc] = useState(null)
    const [pan, setPAN] = useState(null)
    const [payload, setPayload] = useState({})
    const [docPayload, setDocPayload] = useState({})

    const [show, setShow] = useState(false)
    const target = useRef(null)

    const MODAL = {
        // APPROVE: { TYPE: 'approve-button', TITLE: 'Approved Request', MESSAGE: 'Are you sure want to approve this document?' },
        REJECT: { TYPE: 'reject-button', TITLE: 'Reject Reason?', MESSAGE: `Are you sure want to reject ${modal?.docType} card?` },
        // PAN_SUBMIT: { TYPE: 'pan-submit-button', TITLE: 'Submit PAN Card Detail', MESSAGE: 'Are you sure want to submit Pan card ?' },
        // KYC_SUBMIT: { TYPE: 'kyc-submit-button', TITLE: 'KYC Submit', MESSAGE: 'Are you sure want to submit kyc document ?' },
    }

    useEffect(() => {
        const pan = userKYC?.oPan?.eStatus !== 'N'
        const doc = userKYC?.oAadhaar?.eStatus !== 'N'

        pan && setPAN(userKYC?.oPan)
        doc && setDoc(userKYC?.oAadhaar)
        reset({
            sImage: pan && userKYC?.oPan?.sImage,
            sPan: pan ? userKYC?.oPan?.sPan : null,
        })

        resetKYC({
            // eDocument: docColumns?.find(item => item?.value === doc?.eDocument),
            sAadhaar: doc ? userKYC?.oAadhaar?.sAadhaar : null,
            sFrontImage: doc && userKYC?.oAadhaar?.sFrontImage,
            sBackImage: doc && userKYC?.oAadhaar?.sBackImage
        })

    }, [reset, userKYC, resetKYC])

    // ADD PAN CARD
    const { mutate: createMutate, isLoading: addKYCLoading } = useMutation(createKYCDetails, {
        onSuccess: (response) => {
            ReactToastify('KYC Details Added Successfully', 'success')
            query.invalidateQueries('userDataById')
            // setModal({ open: false, type: '' })
            reset()
        },
        onError: (err) => {
            ReactToastify(err?.response?.data?.message, 'error')
        }
    })

    // EDIT PAN CARD
    const { mutate, isLoading: updateKYCLoading } = useMutation(updateKYCDetails, {
        onSuccess: (response) => {
            toaster('KYC Details Updated Successfully', 'success')
            query.invalidateQueries('userDataById')
            // setModal({ open: false, type: '' })
            reset()
        },
        onError: (err) => {
            ReactToastify(err?.response?.data?.message, 'error')
        }
    })

    // UPDATE PAN CARD STATUS
    const { mutate: mutateUserKYCCardStatus } = useMutation(updateKYCStatus, {
        onSuccess: (response) => {
            ReactToastify(response.data.message)
            // setModal({ open: false, type: '' })
            query.invalidateQueries('userDataById')
            reset({
                sRejectReason: '',
                sImage: '',
                sPan: '',
            })
            setModal({ open: false, type: MODAL?.REJECT })
        },
        onError: (err) => {
            ReactToastify(err?.response?.data?.message, 'error')
        }
    })

    useEffect(() => {
        const isDirtyFields = {
            sPan: watch('sPan'),
            sImage: watch('sImage'),
        }

        const payloadData = getDirtyFormValues(dirtyFields, isDirtyFields)
        setPayload(payloadData)
    }, [dirtyFields, watch('sPan'), watch('sImage')])

    const onSubmit = async (data) => {

        //^ CALL CREATE API
        if (data?.sPan && userKYC?.oPan?.eStatus === 'N') {
            const addData = {
                sPan: data?.sPan,
                sImage: '',
                iUserId: id,
                eStatus: 'A',
                sType: 'pan' || '',
            }

            //^ HANDLE PAN IMAGE [PRE-SIGN URL]
            if (data.sImage) {
                try {
                    const sFrontImage = data?.sImage

                    const presign = await myAxios.post(`KYC/pre-sign-url`, {
                        sFileName: sFrontImage.name,
                        sContentType: sFrontImage.type,
                        sType: 'pan',
                        iUserId: id
                    })
                    const Response_Presign = await axios.put(presign.data.data.sUrl, sFrontImage, { headers: { 'Content-Type': sFrontImage.type } })

                    if (Response_Presign.status === 200) {
                        addData.sImage = presign?.data?.data?.sPath
                    }
                } catch (error) {
                    ReactToastify(`Oops! Something went wrong, while uploading Pan Card Image.`, 'error')
                }
            }

            createMutate(addData)
        } else {
            //^ CALL UPDATE API
            const addData = {
                iUserId: id,
                sType: 'pan' || '',
                ...payload
            }

            //^ HANDLE PAN IMAGE [PRE-SIGN URL]
            if (payload.sImage) {
                try {
                    const sFrontImage = payload?.sImage

                    const presign = await myAxios.post(`KYC/pre-sign-url`, {
                        sFileName: sFrontImage.name,
                        sContentType: sFrontImage.type,
                        sType: 'pan',
                        iUserId: id
                    })
                    const Response_Presign = await axios.put(presign.data.data.sUrl, sFrontImage, { headers: { 'Content-Type': sFrontImage.type } })

                    if (Response_Presign.status === 200) {
                        addData.sImage = presign?.data?.data?.sPath
                    }
                } catch (error) {
                    ReactToastify(`Oops! Something went wrong, while uploading Pan Card Image.`, 'error')
                }
            }

            mutate(addData)
        }
        // setPanDetail(addData)
        // setModal({ open: true, type: MODAL?.PAN_SUBMIT?.TYPE })
    }

    //* KYC PAYLOAD
    useEffect(() => {
        const isDirtyFields = {
            sAadhaar: kycWatch('sAadhaar'),
            sFrontImage: kycWatch('sFrontImage'),
            sBackImage: kycWatch('sBackImage'),
        }

        const payloadData = getDirtyFormValues(kycDirtyFields, isDirtyFields)
        setDocPayload(payloadData)
    }, [kycDirtyFields, kycWatch('sBackImage'), kycWatch('sFrontImage'), kycWatch('sAadhaar')])

    const onKYCSubmit = async (document) => {
        if (document?.sAadhaar && userKYC?.oAadhaar?.eStatus === 'N') {
            const addData = {
                // eDocument: document?.eDocument?.value || '',
                sAadhaar: document?.sAadhaar,
                sFrontImage: '',
                sBackImage: '',
                iUserId: id,
                eStatus: 'A',
                sType: 'aadhaar',
            }

            //^ HANDLE AADHAAR CARD FRONT IMAGE [PRE-SIGN URL]
            if (document.sFrontImage) {
                try {
                    const sFrontImage = document?.sFrontImage

                    const presign = await myAxios.post(`KYC/pre-sign-url`, {
                        sFileName: sFrontImage.name,
                        sContentType: sFrontImage.type,
                        sType: 'aadhaar',
                        iUserId: id
                    })
                    const Response_Presign = await axios.put(presign.data.data.sUrl, sFrontImage, { headers: { 'Content-Type': sFrontImage.type } })

                    if (Response_Presign.status === 200) {
                        addData.sFrontImage = presign?.data?.data?.sPath
                    }
                } catch (error) {
                    ReactToastify(`Oops! Something went wrong, while uploading Aadhaar Card front Image.`, 'error')
                }
            }

            //^ HANDLE AADHAAR CARD BACK IMAGE [PRE-SIGN URL]
            if (document.sBackImage) {
                try {
                    const sBackImage = document?.sBackImage

                    const presign = await myAxios.post(`KYC/pre-sign-url`, {
                        sFileName: sBackImage.name,
                        sContentType: sBackImage.type,
                        sType: 'aadhaar',
                        iUserId: id
                    })
                    const Response_Presign = await axios.put(presign.data.data.sUrl, sBackImage, { headers: { 'Content-Type': sBackImage.type } })

                    if (Response_Presign.status === 200) {
                        addData.sBackImage = presign?.data?.data?.sPath
                    }
                } catch (error) {
                    ReactToastify(`Oops! Something went wrong, while uploading Aadhaar Card back Image.`, 'error')
                }
            }

            createMutate(addData)
        } else {
            const addData = {
                // eDocument: document?.eDocument?.value || '',
                ...docPayload,
                iUserId: id,
                sType: 'aadhaar',
            }

            //^ HANDLE AADHAAR CARD FRONT IMAGE [PRE-SIGN URL]
            if (docPayload.sFrontImage) {
                try {
                    const sFrontImage = docPayload?.sFrontImage

                    const presign = await myAxios.post(`KYC/pre-sign-url`, {
                        sFileName: sFrontImage.name,
                        sContentType: sFrontImage.type,
                        sType: 'aadhaar',
                        iUserId: id
                    })
                    const Response_Presign = await axios.put(presign.data.data.sUrl, sFrontImage, { headers: { 'Content-Type': sFrontImage.type } })

                    if (Response_Presign.status === 200) {
                        addData.sFrontImage = presign?.data?.data?.sPath
                    }
                } catch (error) {
                    ReactToastify(`Oops! Something went wrong, while uploading Aadhaar Card front Image.`, 'error')
                }
            }

            //^ HANDLE AADHAAR CARD BACK IMAGE [PRE-SIGN URL]
            if (docPayload.sBackImage) {
                try {
                    const sBackImage = docPayload?.sBackImage

                    const presign = await myAxios.post(`KYC/pre-sign-url`, {
                        sFileName: sBackImage.name,
                        sContentType: sBackImage.type,
                        sType: 'aadhaar',
                        iUserId: id
                    })
                    const Response_Presign = await axios.put(presign.data.data.sUrl, sBackImage, { headers: { 'Content-Type': sBackImage.type } })

                    if (Response_Presign.status === 200) {
                        addData.sBackImage = presign?.data?.data?.sPath
                    }
                } catch (error) {
                    ReactToastify(`Oops! Something went wrong, while uploading Aadhaar Card back Image.`, 'error')
                }
            }

            mutate(addData)
        }
        // setPanDetail(addData)
        // setModal({ open: true, type: MODAL?.KYC_SUBMIT?.TYPE })
    }

    const handleApproveButton = (docID, type) => {
        mutateUserKYCCardStatus({
            iUserId: docID,
            sType: type,
            eStatus: 'A',
            // sRejectReason: ''
        })
        // setModal({ open: true, type: MODAL?.APPROVE?.TYPE, iDocumentId: docID })
    }

    const handleRejectButton = (docID, type) => {
        setModal({ open: true, type: MODAL?.REJECT?.TYPE, iDocumentId: docID, docType: type })
    }

    const handleStatusOperation = () => {
        // if (modal?.type === MODAL?.APPROVE?.TYPE) {

        //     mutateUserKYCCardStatus({
        //         id: id,
        //         payload: {
        //             eStatus: 'approved',
        //             iDocumentId: modal?.iDocumentId,
        //             sPassword: getValues('sPassword')
        //         }
        //     })
        // }
        if (modal?.type === MODAL?.REJECT?.TYPE) {
            if (watch('sRejectReason') !== '') {
                mutateUserKYCCardStatus({
                    eStatus: 'R',
                    iUserId: modal?.iDocumentId,
                    sRejectReason: getValues('sRejectReason'),
                    sType: modal?.docType
                })
            } else {
                ReactToastify('Please Enter the reason', 'warning')

            }



        }
    }

    const handleFileInputClick = (inputRef) => {
        inputRef.current.click()
    }

    return (
        <>
            <Row>
                <Col xxl={6} xl={12} lg={12}>
                    <Wrapper>
                        <h2 className='pan-header'>PAN Card Details</h2><hr />
                        <Form className='step-one' autoComplete='off' onSubmit={handleSubmit(onSubmit)}>
                            <Row className='mt-4'>
                                <Col sm={12}>
                                    <Row>
                                        {/* <Col xxl={6} xl={6} lg={6} md={12} sm={12}>
                                            <CommonInput
                                                type='text'
                                                info={true}
                                                infoMsg={'PAN Number must contain 6 char, 4 digits number & no space allowed.'}
                                                register={register}
                                                errors={errors}
                                                className={`form-control ${errors?.sPan && 'error'}`}
                                                name='sPan'
                                                label='PAN Number'
                                                placeholder='eg: ABCDE0000F'
                                                maxLength={10}
                                                required
                                                onChange={(e) => {
                                                    e.target.value =
                                                        e.target.value?.toUpperCase()?.trim() &&
                                                        e.target.value?.toUpperCase()?.replace(/^[0-9]+$/g, '')
                                                }}
                                                validation={{
                                                    pattern: {
                                                        value: /[A-Z]{5}[0-9]{4}[A-Z]{1}/,
                                                        message: 'Please enter valid PAN card number.'
                                                    },
                                                    required: {
                                                        value: true,
                                                        message: 'Pan card number required'
                                                    }
                                                }}
                                            />
                                        </Col> */}

                                        <Col xxl={6} xl={6} lg={6} md={12} sm={12}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>
                                                    PAN Number
                                                    <span className="inputStar">*</span>
                                                </Form.Label>
                                                <Controller
                                                    name="sPan"
                                                    control={control}
                                                    rules={{
                                                        required: "Pan card number required",
                                                        pattern: {
                                                            value: /[A-Z]{5}[0-9]{4}[A-Z]{1}/,
                                                            message: "Please enter valid PAN card number."
                                                        }
                                                    }}
                                                    render={({ field }) => (
                                                        <Form.Control
                                                            {...field}
                                                            type="text"
                                                            placeholder="eg: ABCDE0000F"
                                                            maxLength={10}
                                                            className='pan-number-input'
                                                            isInvalid={!!errors.sPan}
                                                            onChange={(e) => {
                                                                const value = e.target.value.toUpperCase().trim().replace(/^[0-9]+$/g, '')
                                                                field.onChange(value)
                                                            }}
                                                        />
                                                    )}
                                                />
                                                {errors.sPan && <Form.Control.Feedback type="invalid">{errors.sPan.message}</Form.Control.Feedback>}
                                            </Form.Group>
                                        </Col>

                                        <Col sm={12}>
                                            <Row>
                                                <Col className='fileinput mt-1' xxl={6} xl={6} lg={6} md={12} sm={12}>
                                                    <CustomFileInput>
                                                        <div className='info-content'>
                                                            <CustomFileInputLabel
                                                                target={target} show={show} setShow={setShow}
                                                                label='Add PAN Card Front View'
                                                                tooltip='Image upload limit: 800 KB. Please ensure your file size is within this limit.'
                                                            />
                                                        </div>
                                                        <div className='inputtypefile'>
                                                            <div className='inputMSG'>
                                                                <DocumentPreview watch={watch} name='sImage'
                                                                    fn={() => handleFileInputClick(PANInputRef)}
                                                                    buttonName='Add PAN Card Front View'
                                                                    imgHover='Change PAN Card Image'
                                                                />
                                                            </div>
                                                            <Controller
                                                                name={`sImage`}
                                                                control={control}
                                                                rules={{
                                                                    required: "Please add PAN card front view ",
                                                                    validate: {
                                                                        fileType: (value) => {
                                                                            if (value && typeof (watch(`sImage`)) !== 'string') {
                                                                                const allowedFormats = ['jpeg', 'png', 'jpg', 'JPEG', 'PNG', 'JPG']
                                                                                const fileExtension = value.name?.split('.').pop().toLowerCase()

                                                                                if (!allowedFormats.includes(fileExtension)) {
                                                                                    return "Unsupported file format"
                                                                                }

                                                                                const maxSize = 1 * 1000 * 800 // 1MB in bytes
                                                                                if (value.size >= maxSize) {
                                                                                    return "File size must be less than 800 KB"
                                                                                }
                                                                            }
                                                                            return true
                                                                        },
                                                                    }
                                                                }}
                                                                render={({ field: { onChange, value, ref } }) => {
                                                                    return <>
                                                                        <Form.Control
                                                                            ref={(e) => {
                                                                                ref(e)
                                                                                PANInputRef.current = e
                                                                            }}
                                                                            type='file'
                                                                            name={`sImage`}
                                                                            accept='.jpg,.jpeg,.png,.JPEG,.JPG,.PNG'
                                                                            errors={errors}
                                                                            className={errors?.sImage && 'error'}
                                                                            onChange={(e) => {
                                                                                onChange(e.target.files[0])
                                                                            }}
                                                                        />
                                                                    </>
                                                                }}
                                                            />
                                                        </div>

                                                        <span className='card-error'>{errors && errors?.sImage && <Form.Control.Feedback type="invalid">{errors?.sImage.message}</Form.Control.Feedback>}</span>
                                                    </CustomFileInput>
                                                </Col>
                                            </Row>
                                        </Col>
                                    </Row>
                                </Col>
                                {pan?.sRejectReason && pan?.eStatus === 'R' &&
                                    <Col Col lg={6} md={12}>
                                        <div className='reason'>
                                            <span className=''>Reason for Rejection :- </span>
                                            <span className='description text-uppercase'>{pan?.sRejectReason}</span>
                                        </div>
                                    </Col>
                                }
                            </Row>
                            <div className='d-flex gap-2 justify-content-end mt-2'>
                                <Button type='submit' className='mt-3 mt-lg-3' disabled={!isDirty || addKYCLoading || updateKYCLoading}>Submit</Button>
                                {pan?.eStatus === 'P' && (<>
                                    <Button className='mt-3 mt-lg-3 approve' onClick={() => handleApproveButton(id, 'pan')}>Approve</Button>
                                    <Button className='mt-3 mt-lg-3 reject' onClick={() => handleRejectButton(id, 'pan')}>Reject</Button>
                                </>)}
                                {pan?.eStatus === 'A' && <Button className='mt-3 mt-lg-3 reject' onClick={() => handleRejectButton(id, 'pan')}>Reject</Button>}
                                {/* {pan?.eStatus === 'R' && <Button className='mt-3 mt-lg-3 approve' onClick={() => handleApproveButton(id, 'pan')} disabled={getValues('sPan') === '' || getValues('sPan') === undefined}>Approve</Button>} */}
                            </div>
                        </Form>
                    </Wrapper><br />
                </Col >

                <Col xxl={6} xl={12} lg={12}>
                    <Wrapper>
                        <h2 className='pan-header'>KYC Documents</h2><hr />
                        <Form className='step-one' autoComplete='off' onSubmit={kycHandleSubmit(onKYCSubmit)}>
                            <Row className='mt-4'>
                                <Col sm={12}>
                                    <Row>
                                        {/* <Col md={6} sm={12}>
                                            <Form.Group className='form-group mb-3'>
                                                <Form.Label>
                                                    <span>
                                                        KYC Details
                                                        <span className='inputStar'>*</span>
                                                    </span>
                                                </Form.Label>
                                                <Controller
                                                    name='eDocument'
                                                    control={kycControl}
                                                    rules={{
                                                        required: {
                                                            value: true,
                                                            message: 'Please select document type'
                                                        }
                                                    }}
                                                    render={({ field: { onChange, value, ref } }) => (
                                                        <Select
                                                            placeholder='Select document'
                                                            ref={ref}
                                                            defaultValue={userKYC?.sNumber === null && docColumns?.find(item => item?.value === userKYC?.eDocument)}
                                                            options={docColumns}
                                                            getOptionLabel={(option) => option?.label}
                                                            getOptionValue={(option) => option?.value}
                                                            className={`react-select border-0 ${kycErrors.eDocument && 'error'}`}
                                                            classNamePrefix='select'
                                                            isSearchable={false}
                                                            value={value}
                                                            onChange={onChange}
                                                        />
                                                    )}
                                                />
                                                {kycErrors.eDocument && (
                                                    <Form.Control.Feedback type='invalid'>
                                                        {kycErrors.eDocument.message}
                                                    </Form.Control.Feedback>
                                                )}
                                            </Form.Group>
                                        </Col> */}

                                        <Col xxl={6} xl={6} lg={6} md={12} sm={12}>
                                            <CommonInput
                                                type='text'
                                                info={true}
                                                infoMsg={'Aadhaar Number must contain 12 digits & no space allowed.'}
                                                register={kycRegister}
                                                errors={kycErrors}
                                                className={`form-control ${kycErrors?.sAadhaar && 'error'}`}
                                                name='sAadhaar'
                                                label='Aadhaar Number'
                                                placeholder='eg: 123456789012'
                                                required
                                                onChange={(e) => {
                                                    e.target.value =
                                                        e.target.value?.trim().replace(/[^0-9]/g, '')
                                                }}
                                                maxLength={12}
                                                validation={{
                                                    pattern: {
                                                        value: /^[0-9]{12}$/,
                                                        message: 'Please enter valid Aadhaar card number.'
                                                    },
                                                    required: {
                                                        value: true,
                                                        message: 'Aadhaar card number required'
                                                    }
                                                }}
                                            />
                                        </Col>

                                        <Col className='fileinput mt-xxl-0 mt-xl-0 p-1' sm={12}>
                                            <Row className='p-2 pt-0 mt-xxl-0 mt-xl-0'>
                                                <Col className='fileinput' lg={6} md={12} sm={12}>
                                                    <CustomFileInput>
                                                        <div className='info-content'>
                                                            <CustomFileInputLabel
                                                                show={show} setShow={setShow} target={target}
                                                                label='Add Document Front View'
                                                                tooltip='Image upload limit: 800 KB. Please ensure your file size is within this limit.'
                                                            />
                                                        </div>
                                                        <div className='inputtypefile mt-2'>
                                                            <div className='inputMSG'>
                                                                <DocumentPreview
                                                                    buttonName='Upload Front View'
                                                                    fn={() => handleFileInputClick(KYCFrontInputRef)}
                                                                    imgHover='Change Document Front View'
                                                                    name='sFrontImage' watch={kycWatch}
                                                                />
                                                            </div>

                                                            <Controller
                                                                name={`sFrontImage`}
                                                                control={kycControl}
                                                                rules={{
                                                                    required: "Please add document front view",
                                                                    validate: {
                                                                        fileType: (value) => {
                                                                            if (value && typeof (kycWatch(`sFrontImage`)) !== 'string') {
                                                                                const allowedFormats = ['jpeg', 'png', 'jpg', 'JPEG', 'PNG', 'JPG']
                                                                                const fileExtension = value.name?.split('.').pop().toLowerCase()

                                                                                if (!allowedFormats.includes(fileExtension)) {
                                                                                    return "Unsupported file format"
                                                                                }

                                                                                const maxSize = 1 * 1000 * 800 // 1MB in bytes
                                                                                if (value.size >= maxSize) {
                                                                                    return "File size must be less than 800 KB"
                                                                                }
                                                                            }
                                                                            return true
                                                                        },
                                                                    }
                                                                }}
                                                                render={({ field: { onChange, value, ref } }) => {
                                                                    return <>
                                                                        <Form.Control
                                                                            ref={(e) => {
                                                                                ref(e)
                                                                                KYCFrontInputRef.current = e
                                                                            }}
                                                                            type='file'
                                                                            name={`sFrontImage`}
                                                                            accept='.jpg,.jpeg,.png,.JPEG,.JPG,.PNG'
                                                                            errors={errors}
                                                                            className={kycErrors?.sFrontImage && 'error'}
                                                                            onChange={(e) => {
                                                                                onChange(e.target.files[0])
                                                                            }}
                                                                        />
                                                                    </>
                                                                }}
                                                            />
                                                        </div>

                                                        {kycErrors && kycErrors?.sFrontImage && <Form.Control.Feedback type="invalid" className='p-3 pt-0'>{kycErrors?.sFrontImage.message}</Form.Control.Feedback>}
                                                    </CustomFileInput>
                                                </Col>

                                                <Col className='fileinput mt-xxl-0 mt-xl-0 mt-lg-0 mt-md-0 mt-sm-0 mt-2' lg={6} md={12} sm={12}>
                                                    <CustomFileInput>
                                                        <div className='info-content'>
                                                            <CustomFileInputLabel
                                                                setShow={setShow} show={show} target={target}
                                                                label='Add Document Back View'
                                                                tooltip='Image upload limit: 800 KB. Please ensure your file size is within this limit.'
                                                            />
                                                        </div>
                                                        <div className='inputtypefile mt-2'>
                                                            <div className='inputMSG'>
                                                                <DocumentPreview
                                                                    buttonName='Upload Back View'
                                                                    fn={() => handleFileInputClick(KYCBackInputRef)}
                                                                    imgHover='Change Document Back View'
                                                                    name='sBackImage' watch={kycWatch}
                                                                />
                                                            </div>

                                                            <Controller
                                                                name={`sBackImage`}
                                                                control={kycControl}
                                                                rules={{
                                                                    required: "Please add document back view",
                                                                    validate: {
                                                                        fileType: (value) => {
                                                                            if (value && typeof (kycWatch(`sBackImage`)) !== 'string') {
                                                                                const allowedFormats = ['jpeg', 'png', 'jpg', 'JPEG', 'PNG', 'JPG']
                                                                                const fileExtension = value.name?.split('.').pop().toLowerCase()

                                                                                if (!allowedFormats.includes(fileExtension)) {
                                                                                    return "Unsupported file format"
                                                                                }

                                                                                const maxSize = 1 * 1000 * 800 // 1MB in bytes
                                                                                if (value.size >= maxSize) {
                                                                                    return 'File size must be less than 800 KB'
                                                                                }
                                                                            }
                                                                            return true
                                                                        },
                                                                    }
                                                                }}
                                                                render={({ field: { onChange, value, ref } }) => {
                                                                    return <>
                                                                        <Form.Control
                                                                            ref={(e) => {
                                                                                ref(e)
                                                                                KYCBackInputRef.current = e
                                                                            }}
                                                                            type='file'
                                                                            name={`sBackImage`}
                                                                            accept='.jpg,.jpeg,.png,.JPEG,.JPG,.PNG'
                                                                            errors={kycErrors}
                                                                            className={kycErrors?.sBackImage && 'error'}
                                                                            onChange={(e) => {
                                                                                onChange(e.target.files[0])
                                                                            }}
                                                                        />
                                                                    </>
                                                                }}
                                                            />
                                                        </div>

                                                        {kycErrors && kycErrors?.sBackImage && <Form.Control.Feedback type="invalid" className='p-3 pt-0'>{kycErrors?.sBackImage.message}</Form.Control.Feedback>}
                                                    </CustomFileInput>
                                                </Col>
                                            </Row>
                                        </Col>

                                        {doc?.eStatus === 'R' &&
                                            <Col lg={6} md={12}>
                                                <div className='reason'>
                                                    <span>Reason for Rejection :- </span>
                                                    <span className='description'>{doc?.sRejectReason}</span>
                                                </div>
                                            </Col>
                                        }
                                    </Row>
                                </Col>
                            </Row>
                            <div className='d-flex justify-content-end gap-2'>
                                <Button type='submit' className='mt-3 mt-lg-3' disabled={!kycIsDirty || addKYCLoading || updateKYCLoading}>Submit</Button>
                                {doc?.eStatus === 'P' && (<>
                                    <Button className='mt-3 mt-lg-3 approve' onClick={() => handleApproveButton(id, 'aadhaar')}>Approve</Button>
                                    <Button className='mt-3 mt-lg-3 reject' onClick={() => handleRejectButton(id, 'aadhaar')}>Reject</Button>
                                </>)}
                                {doc?.eStatus === 'A' && <Button className='mt-3 mt-lg-3 reject' onClick={() => handleRejectButton(id, 'aadhaar')}>Reject</Button>}
                                {/* {doc?.eStatus === 'R' && <Button className='mt-3 mt-lg-3 approve' onClick={() => handleApproveButton(id, 'aadhaar')}>Approve</Button>} */}
                            </div>
                        </Form>
                    </Wrapper>
                </Col >
            </Row >

            {modal?.type === MODAL?.REJECT?.TYPE &&
                <CustomModal
                    open={modal.open}
                    handleClose={() => setModal({ open: false, type: '' })}
                    handleConfirm={() => handleStatusOperation(modal?.iDocumentId)}
                    disableHeader
                    bodyTitle={MODAL?.REJECT?.TITLE}
                    confirmValue={getValues('sPassword')}
                >
                    <article>
                        <h5>
                            <div className='text-info'>
                                {MODAL?.REJECT?.MESSAGE}
                            </div>
                        </h5>
                        {/* <CommonInput
                            type='text'
                            register={register}
                            errors={errors}
                            className={`form-control ${errors?.sPassword && 'error'}`}
                            name='sPassword'
                            placeholder='Enter password'
                            onChange={(e) => {
                                e.target.value =
                                    e.target.value?.trim() &&
                                    e.target.value.replace(/^[0-9]+$/g, '')
                            }}
                        /> */}
                        <CommonInput
                            type='textarea'
                            register={register}
                            errors={errors}
                            className={`form-control ${errors?.sRejectReason && 'error'} mt-3`}
                            name='sRejectReason'
                            placeholder='Type rejection reason here...'
                            onChange={(e) => e.target.value}
                        />
                    </article>
                </CustomModal>
                //     : modal?.open === true &&
                // <CommonPasswordModal
                //     isTextArea={false}
                //     modal={modal?.open}
                //     setModal={setModal}
                //     reset={reset || resetKYC}
                //     bodyTitle={
                //         modal?.type === MODAL?.PAN_SUBMIT?.TYPE ?
                //             MODAL?.PAN_SUBMIT?.TITLE : modal?.type === MODAL?.APPROVE?.TYPE ?
                //                 MODAL?.APPROVE?.TITLE : MODAL?.KYC_SUBMIT?.TITLE
                //     }
                //     message={
                //         modal?.type === MODAL?.PAN_SUBMIT?.TYPE ?
                //             MODAL?.PAN_SUBMIT?.MESSAGE : modal?.type === MODAL?.APPROVE?.TYPE ?
                //                 MODAL?.APPROVE?.MESSAGE : MODAL?.KYC_SUBMIT?.MESSAGE
                //     }
                //     handleConfirm={modal?.type === MODAL?.APPROVE?.TYPE ? handleStatusOperation : handleConfirmAdd}
                //     confirmValue={getValues('sPassword')}
                //     register={register}
                //     errors={errors}
                //     name='sPassword'
                // />
            }
        </>
    )
}

export default UserKYCDetail
