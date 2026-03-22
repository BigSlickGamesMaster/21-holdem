/* eslint-disable react/prop-types */
import React from 'react'
import moment from 'moment'
import { Button, Form } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { route } from 'shared/constants/AllRoutes'
import TriggerTooltip from '../Tooltip'

function UserRow({ user, index, onStatusChange, onDelete, statusLoading, requestParams }) {
  const navigate = useNavigate()

  function onViewClick(id) {
    navigate(route.viewUser(id), { state: requestParams })
  }

  function onEditClick(id) {
    navigate(route.editUser(id), { state: requestParams })
  }
  return (
    <tr key={user._id} style={{ textAlign: 'center' }}>
      <td>{index + 1}</td>
      <td>
        <TriggerTooltip className="user" data={user.sUserName || '-'} display={user.sUserName || '-'} onClick={() => navigate(route.viewUser(user?._id))} />
      </td>
      <td>{user.sEmail || '-'}</td>
      {/* <td>{user.sMobile || '-'}</td> */}
      <td>{user.nChips || '0'}</td>
      <td className="text-nowrap">{moment(user.dCreatedDate).format('DD-MM-YYYY hh:mm:ss A') || '-'}</td>
      <td>
        {user?.eStatus !== 'd' ? (
          <Form.Check
            type="switch"
            name={user._id}
            className="d-inline-block me-1"
            checked={user.eStatus === 'y'}
            disabled={statusLoading}
            onChange={e => onStatusChange(user?._id, e.target.checked)}
          />
        ) : (
          <span className="text-danger">Deleted</span>
        )}
      </td>
      <td style={{ textAlign: 'center', textWrap: 'nowrap' }}>
        {user?.eStatus !== 'd' ? (
          <>
            <Button variant="link" className="square icon-btn" onClick={() => onViewClick(user?._id)}>
              <i className="icon-visibility d-block" />
            </Button>
            <Button variant="link" className="square icon-btn" onClick={() => onEditClick(user?._id)}>
              <i className="icon-create d-block" />
            </Button>
            <Button variant="link" className="square icon-btn" onClick={() => onDelete(user._id, user?.sUserName)}>
              <i className="icon-delete d-block" />
            </Button>
          </>
        ) : (
          <Button variant="link" className="square icon-btn" as={Link} to={route.viewUser(user?._id, 'view')}>
            <i className="icon-visibility d-block" />
          </Button>
        )}
      </td>
    </tr>
  )
}

export default UserRow
