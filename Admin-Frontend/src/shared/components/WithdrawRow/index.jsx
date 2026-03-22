/* eslint-disable react/prop-types */
import React, { useState } from 'react'
// import { formatNumber } from 'helper/helper'
import { updateWithdrawById } from 'query/finance/finance.query'
import { Button, Form, Modal } from 'react-bootstrap'
import { Controller, useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from 'react-query'
import { ReactToastify } from 'shared/utils'

function WithdrawRow({ data, index }) {
  const query = useQueryClient()
  const { control, watch, setValue } = useForm({ mode: 'all' })

  const [modal, setModal] = useState({ type: false, data: {} })
  const [transactionID, setTransactionID] = useState('')

  const prevTransID = localStorage.getItem('prevTransID')

  // UPDATE TRANSACTION STATUS
  const { mutate } = useMutation(updateWithdrawById, {
    onSuccess: response => {
      localStorage.setItem('prevTransID', response?.data?.data?.transactionId)
      query.invalidateQueries('withdraw')
      ReactToastify(response?.data?.message, 'success')
      setValue(`sTransactionId_${transactionID}`, '')
    },
    onError: error => {
      ReactToastify(error?.response?.data?.message, 'error')
    },
  })

  const handleApproveBtn = id => {
    const fieldName = `sTransactionId_${id}`
    const sTransactionIdValue = watch(fieldName)

    const approveData = {
      eStatus: 'Success',
      sTransactionId: sTransactionIdValue,
      id: id,
    }

    if (sTransactionIdValue === prevTransID) {
      ReactToastify('Transaction ID must not be same. Please enter the unique ID again.', 'warning', 'warning')
    } else {
      sTransactionIdValue !== '' ? mutate(approveData) : ReactToastify('Please enter the Transaction ID', 'warning', 'warning')
    }
  }

  const handleRejectBtn = data => {
    const rejectData = {
      eStatus: 'Failed',
      id: data,
    }

    mutate(rejectData)
  }

  const handleViewBtn = data => {
    setModal({ type: true, data })
  }
  return (
    <>
      <tr key={data._id} style={{ textAlign: 'center' }}>
        <td>{index + 1}</td>
        <td>{data?._id}</td>
        <td>{data?.iUserId || '-'}</td>
        <td className="text-capitalize">{data?.sUserName || '-'}</td>
        {/* <td>{data?.sEmail || '-'}</td> */}
        {/* <td>{data?.sMobile || '-'}</td> */}
        <td> {data?.nAmount || '-'}</td>
        <td className="text-capitalize">{data?.eStatus ? <span className="pending">Pending</span> : '-'}</td>
        <td>
          <Form.Group>
            <Controller
              name={`sTransactionId_${data?._id}`}
              control={control}
              defaultValue={data?.sTransactionId || ''}
              rules={{
                pattern: {
                  value: /^[0-9]+$/,
                  message: 'Only numbers are allowed',
                },
              }}
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <>
                  <Form.Control
                    type="text"
                    className={`form-control ${error ? 'is-invalid' : ''}`}
                    value={value}
                    onChange={e => {
                      setTransactionID(data?._id)
                      onChange(e.target.value)
                    }}
                    placeholder=""
                    isInvalid={!!error}
                  />
                  <Form.Control.Feedback type="invalid">{error?.message}</Form.Control.Feedback>
                </>
              )}
            />
          </Form.Group>
        </td>
        <td style={{ textAlign: 'center', textWrap: 'nowrap' }}>
          <Button variant="info" type="button" className="square icon-btn me-2" onClick={() => handleViewBtn(data)}>
            Bank
          </Button>
          <Button variant="success" type="button" className="square icon-btn me-2" onClick={() => handleApproveBtn(data?._id)}>
            Approve
          </Button>
          <Button variant="danger" className="square icon-btn" onClick={() => handleRejectBtn(data?._id)}>
            Reject
          </Button>
        </td>
      </tr>

      <Modal show={modal?.type} onHide={() => setModal({ type: false, data: {} })} className="withdrawal-view-modal">
        <Modal.Header className="modal-heade" closeButton>
          <Modal.Title>Bank Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="modal-body">
          <div className="inner-content">
            <div className="data-title">Bank Name</div>
            <div className="data-value">{modal?.data?.sBankName}</div>
          </div>
          <div className="inner-content">
            <div className="data-title">Branch Name</div>
            <div className="data-value">{modal?.data?.sBranchName}</div>
          </div>
          <div className="inner-content">
            <div className="data-title">Account Holder Name</div>
            <div className="data-value">{modal?.data?.sAccountHolderName}</div>
          </div>
          <div className="inner-content">
            <div className="data-title">Account Number</div>
            <div className="data-value">{modal?.data?.sAccountNo}</div>
          </div>
          <div className="inner-content">
            <div className="data-title">IFSC Code</div>
            <div className="data-value">{modal?.data?.sIFSC}</div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  )
}

export default WithdrawRow
