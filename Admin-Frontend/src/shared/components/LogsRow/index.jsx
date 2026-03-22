/* eslint-disable react/prop-types */
import React from 'react'
import { Button } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { route } from 'shared/constants/AllRoutes'
import TriggerTooltip from '../Tooltip'
import moment from 'moment'

const LogsRow = ({ data, index }) => {
  const navigate = useNavigate()
  return (
    <>
      <tr key={index}>
        <td>{index + 1}</td>
        <td>
          <TriggerTooltip
            className="text-capitalize user"
            data={data.iBoardId || '-'}
            display={data.iBoardId || '-'}
            onClick={() => navigate(route.viewGameLogs(data._id, 'view'))}
          />
        </td>
        {/* <td className="text-capitalize">{data?.eGameType || '-'}</td> */}
        <td className="text-capitalize">{data?.sPrivateCode ? <span className="private-type">Private</span> : <span className="public-type">Public</span>}</td>
        {/* <td className="text-capitalize"><span className='leaderboard-type'>Leaderboard</span></td> */}
        <td>{data.aWinner?.length + data.aLooser?.length ?? '0'}</td>
        <td className="">
          {data.aWinner?.map(winner => winner?.sUserName).join(', ') ? (
            <span>{data.aWinner?.map(winner => winner?.sUserName).join(', ')}</span>
          ) : (
            <span style={{ backgroundColor: '#31c52c', color: '#fff', padding: '5px', borderRadius: '8px', fontSize: '15px' }}>Admin</span>
          )}
        </td>
        <td>{data.aWinner?.map(winner => winner?.nWinningAmount).reduce((a, b) => a + b, 0) || data.nTableChips}</td>
        <td className="text-nowrap">{moment(data.dCreatedDate).format('DD-MM-YYYY HH:mm:ss') || '-'}</td>
        <td className="text-capitalize" id="gameStatus">
          {data.eState === 'finished' ? <span className="finished">Finished</span> : '-'}
        </td>
        <td style={{ textAlign: 'center' }}>
          <Button variant="link" className="square icon-btn" as={Link} to={route.viewGameLogs(data?._id, 'view')}>
            <i className="icon-visibility d-block" />
          </Button>
        </td>
      </tr>
    </>
  )
}

export default LogsRow
