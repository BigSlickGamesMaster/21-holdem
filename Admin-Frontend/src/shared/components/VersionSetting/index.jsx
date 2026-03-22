/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useMemo, useState } from 'react'
import DataTable from '../DataTable'
import { versionSettingColumns } from 'shared/constants/TableHeaders'
import { Link } from 'react-router-dom'
import { Button, Col, Form, Row } from 'react-bootstrap'
import { useMutation, useQueryClient } from 'react-query'
import CustomModal from '../Modal'
import { ReactToastify } from 'shared/utils'
import { updateSettingVersion } from 'query/settings/settings.query'
import './style.scss'
import { Controller } from 'react-hook-form'

function VersionSetting ({ data, register, errors, handleSubmit, reset, control }) {
    const query = useQueryClient()
    function getSortedColumns (adminTableColumns, urlData) {
        return adminTableColumns?.map((column) => (column.internalName === urlData?.sort ? { ...column, type: +urlData?.orderBy } : column))
    }

    // Status
    const { mutate: updateMutate } = useMutation(updateSettingVersion, {
        onSuccess: (response) => {
            query.invalidateQueries('setting')
            ReactToastify('Version Setting has updated successfully.', 'success')
            reset({
                sVersion: ''
            })
            setModal({ open: false, id: '' })
        }
    })

    const handleOnChange = (id, status) => {
        updateMutate({
            id: id,
            bForceUpdate: status ? 'y' : 'n'
        })
    }

    const [modal, setModal] = useState({ open: false, id: '' })
    const [versionID, setVersionID] = useState('')
    const columns = useMemo(() => getSortedColumns(versionSettingColumns), [])

    function onSubmit (data) {
        updateMutate({
            id: versionID,
            sVersion: data?.sVersion,
            sMinimumVersion: data?.sMinimumVersion
        })
    }

    function handleUpdate (version) {
        setModal({ open: true, id: version?._id })
        setVersionID(version?._id)
    }
    return (
        <>
            <h1 className='setting-title'>App Version Control:</h1>
            <DataTable
                columns={columns}
                header={{
                    left: {
                        rows: false
                    },
                    right: {
                        search: false,
                        filter: false
                    }
                }}
            >
                {data?.map((version, i) => {
                    return (
                        <tr key={version?._id}>
                            <td>{i + 1}</td>
                            <td>{version?.sVersion}</td>
                            {/* <td>{version?.sMinimumVersion}</td> */}
                            <td><span className='game-pack'>{version?.eGamePack}</span></td>
                            <td className='text-capitalize'>{version?.eType}</td>
                            {/* <td className='text-truncate'><Link to={version?.sUrl} target='_blank' className='url'>{version?.sUrl}</Link></td> */}
                            <td>
                                {/* <Form.Check
                                    type='switch'
                                    name={version?._id}
                                    className='d-inline-block me-1'
                                    checked={version?.bForceUpdate === 'y'}
                                    onChange={(e) => handleOnChange(version?._id, e.target.checked)}
                                /> */}
                                <span className={version?.bForceUpdate === 'y' ? 'success' : 'danger'}>{version?.bForceUpdate === 'y' ? 'Active' : 'In Active'}</span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                                <Button
                                    variant="link"
                                    className="square icon-btn"
                                    as={Link}
                                    onClick={() => handleUpdate(version)}
                                >
                                    <i className='icon-create d-block' />
                                </Button>
                            </td>
                        </tr>
                    )
                })}
            </DataTable>
            <CustomModal
                open={modal?.open}
                handleClose={() => setModal({ open: false, id: '' })}
                handleConfirm={handleSubmit(onSubmit)}
                disableHeader
                bodyTitle='Edit Version'
                className='edit-version-model'
            >
                <div>
                    <Row>
                        <Col>
                            <Controller
                                name="sVersion"
                                control={control}
                                defaultValue=""
                                rules={{
                                    required: 'Version is required',
                                    pattern: {
                                        value: /^[0-9]*\.?[0-9]+$/,
                                        message: 'Only numeric values are allowed',
                                    },
                                }}
                                render={({ field }) => (
                                    <>
                                        <Form.Group controlId="sVersion" className='form-group'>
                                            <Form.Label>Version</Form.Label>
                                            <Form.Control
                                                {...field}
                                                type="text"
                                                placeholder="Enter the version"
                                                isInvalid={!!errors.sVersion}
                                            />
                                            {errors.sVersion && (
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.sVersion.message}
                                                </Form.Control.Feedback>
                                            )}
                                        </Form.Group>
                                    </>
                                )}
                            />

                        </Col>
                        {/* <Col>
                            <CommonInput
                                type='text'
                                register={register}
                                errors={errors}
                                className={`form-control ${errors?.sMinimumVersion && 'error'}`}
                                name='sMinimumVersion'
                                label='Minimum Version'
                                placeholder='Enter the minimum version'
                                onChange={(e) => {
                                    e.target.value =
                                        e.target.value?.trim() &&
                                        e.target.value.replace(/^[a-zA-z]+$/g, '')
                                }}
                            />
                        </Col> */}
                    </Row>
                </div>
            </CustomModal>
        </>
    )
}

export default VersionSetting 
