/* eslint-disable react/prop-types */
// import { formatNumber } from 'helper/helper'
import moment from 'moment'
import React, { useState } from 'react'
import { Button, Modal } from 'react-bootstrap'

function FinanceRow({ data, index, onView, transactionData, setViewId }) {
  const [show, setShow] = useState(false)

  const handleClose = () => {
    setShow(false)
    setViewId('')
  }
  const handleShow = () => setShow(true)

  const getStatus = type => {
    switch (type) {
      case 'Success':
        return 'Success'
      case 'Failed':
        return 'Failed'
      case 'Pending':
        return 'Pending'
      default:
        return 'Unknown'
    }
  }

  const getType = type => {
    switch (type) {
      case 'credit':
        return 'Credit'
      case 'debit':
        return 'Debit'
      default:
        return 'Credit'
    }
  }
  return (
    <>
      <tr key={data._id} style={{ textAlign: 'center' }}>
        <td>{index + 1}</td>
        <td>{data?._id}</td>
        {/* <td>{data?.iUserId}</td> */}
        <td>{data?.sUserName || '-'}</td>
        {/* <td>{data?.sEmail || '-'}</td> */}
        {/* <td>{data?.sMobile || '-'}</td> */}
        <td className="text-capitalize">{data?.eMode || '-'}</td>
        <td>{data?.nAmount || '0'}</td>
        <td className="text-capitalize">
          <span className={data?.eType === 'credit' ? 'credited' : data?.eType === 'debit' ? 'debited' : 'credited'}>{getType(data?.eType) || '-'}</span>
        </td>
        <td className="text-capitalize">
          {data?.eStatus ? <span className={data?.eStatus === 'Success' ? 'success' : data?.eStatus === 'Failed' ? 'rejected' : 'pending'}>{getStatus(data?.eStatus)}</span> : '-'}
        </td>
        <td>{moment(data?.dCreatedDate).format('DD-MM-YYYY HH:mm:ss') || '-'}</td>
        <td style={{ textAlign: 'center' }}>
          <Button
            variant="link"
            className="square icon-btn"
            onClick={() => {
              onView(data?._id)
              handleShow()
            }}
          >
            <i className="icon-visibility d-block" />
          </Button>
        </td>
      </tr>

      <Modal show={show} onHide={handleClose} className="withdrawal-view-modal">
        <Modal.Header className="modal-heade" closeButton>
          <Modal.Title>Transaction Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="modal-body">
          <div>
            <span>Transaction Status</span>
            <span
              className={`tag-button ${
                transactionData.eStatus === 'Success' ? 'success' : transactionData.eStatus === 'Rejected' ? 'danger' : transactionData.eStatus === 'Pending' ? 'warning' : 'danger'
              }`}
            >
              {getStatus(transactionData.eStatus) || '-'}
            </span>
          </div>
          <div>
            <span>User Name</span>
            <span>{transactionData?.iUserId?.sUserName || '-'}</span>
          </div>
          <div>
            <span>User ID</span>
            <span>{transactionData?.iUserId?._id || '-'}</span>
          </div>
          <div>
            <span>Category</span>
            <span>{transactionData?.eMode || '-'}</span>
          </div>
          <div>
            <span>Type</span>
            <span className={`tag-button ${transactionData.eType === 'credit' ? 'success' : transactionData.eType === 'debit' ? 'danger' : 'pending'}`}>
              {getType(transactionData?.eType) || '-'}
            </span>
          </div>
          {/* <div>
            <span>Description</span>
            <span>{transactionData?.sDescription || '-'}</span>
          </div> */}
          <div>
            <span>Amount</span>
            <span> {transactionData?.nAmount || '0'}</span>
          </div>
          <div>
            <span>Date</span>
            <span>{moment(transactionData.dCreatedDate).format('DD-MM-YYYY HH:mm:ss') || '-'}</span>
          </div>
        </Modal.Body>
      </Modal>
    </>
  )
}

export default FinanceRow
