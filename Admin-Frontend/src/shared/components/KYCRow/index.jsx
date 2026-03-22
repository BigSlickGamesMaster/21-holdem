/* eslint-disable react/prop-types */
import React from 'react'
import { Button } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { route } from 'shared/constants/AllRoutes'

function KYCRow ({ data, index }) {
    const navigate = useNavigate()

    const getPanStatus = (type) => {
        switch (type) {
            case 'P':
                return 'pending'
            case 'A':
                return 'approved'
            case 'R':
                return 'rejected'
            default:
                return 'not-found'
        }
    }
    return (
        <>
            <tr
                key={data._id}
                style={{ textAlign: 'center' }}>
                <td>{index + 1}</td>
                <td>{data?.iUserId || '-'}</td>
                <td className='text-capitalize'>{data?.sUserName || '-'}</td>
                <td className='text-capitalize'><span className={getPanStatus(data?.ePanStatus)}>{getPanStatus(data?.ePanStatus) || '-'}</span></td>
                <td className='text-capitalize'><span className={getPanStatus(data?.eAadhaarStatus)}>{getPanStatus(data?.eAadhaarStatus) || '-'}</span></td>
                <td style={{ textAlign: 'center' }}>
                    <Button
                        variant='link'
                        className='square icon-btn'
                        onClick={() => navigate(route?.viewUser(data?.iUserId), { state: 'view-kyc' })}>
                        <i className='icon-visibility d-block' />
                    </Button>
                </td>
            </tr>
        </>
    )
}

export default KYCRow
