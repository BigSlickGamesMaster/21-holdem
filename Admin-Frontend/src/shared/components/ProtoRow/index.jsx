/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React from 'react'
import moment from 'moment'
import { Button, Form } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { route } from 'shared/constants/AllRoutes'
import TriggerTooltip from '../Tooltip'

function ProtoRow({ proto, index, onStatusChange, onDelete, statusLoading, requestParams }) {
  const navigate = useNavigate()

  function onViewClick(id) {
    navigate(route.viewProto(id, 'view'), { state: requestParams })
  }

  function onEditClick(id) {
    navigate(route.editProto(id, 'edit'), { state: requestParams })
  }
  return (
    <tr key={proto._id} style={{ textAlign: 'center' }}>
      <td>{index + 1}</td>
      <td>
        <TriggerTooltip className="user" data={proto.sName || '-'} display={proto.sName || '-'} onClick={() => navigate(route.viewProto(proto?._id, 'view'))} />
      </td>
      {/* <td>{formatNumber(proto.nBoardFee) || '0'}</td> */}
      <td>{proto.nMaxPlayer || '-'}</td>
      <td>{proto.nMinBuyIn || '-'}</td>
      {/* <td>{proto.nMaxBuyIn || '-'}</td> */}
      <td>{proto.nTurnTime || '-'}</td>
      {/* <td>{proto.nMaxTableAmount || '-'}</td> */}
      {/* <td>{proto.nMinBet || '-'}</td> */}
      {/* <td>{proto.nMaxBet || '-'}</td> */}
      {/* <td>{formatNumber(proto.aWinningAmount[0]) || "0"}</td> */}
      {/* <td>{proto.nTurnTime || "-"}</td>
      <td>{proto.nGameTime / 1000 || "-"}</td> */}
      {/* <td>{proto.nGameTime || "-"}</td> */}
      <td>{moment(proto.dCreatedDate).format('DD-MM-YYYY hh:mm:ss A') || '-'}</td>
      <td>
        {proto?.eStatus !== 'd' ? (
          <Form.Check
            type="switch"
            name={proto._id}
            className="d-inline-block me-1"
            checked={proto.eStatus === 'y'}
            disabled={statusLoading}
            onChange={e => onStatusChange(proto?._id, e.target.checked)}
          />
        ) : (
          <span className="text-danger">Deleted</span>
        )}
      </td>
      <td style={{ textAlign: 'center' }}>
        <Button variant="link" className="square icon-btn" onClick={() => onViewClick(proto?._id)}>
          <i className="icon-visibility d-block" />
        </Button>
        <Button variant="link" className="square icon-btn" onClick={() => onEditClick(proto?._id)}>
          <i className="icon-create d-block" />
        </Button>
        <Button variant="link" className="square icon-btn" onClick={() => onDelete(proto?._id)}>
          <i className="icon-delete d-block" />
        </Button>
      </td>
    </tr>
  )
}

export default ProtoRow
