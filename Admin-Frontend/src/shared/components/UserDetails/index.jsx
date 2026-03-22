/* eslint-disable react/prop-types */
import React from 'react'
import moment from 'moment'
import { Col, Row } from 'react-bootstrap'

const UserDetails = ({ userData }) => {
  return (
    <>
      <Row className="details-row">
        <Col xxl={12} xl={12} md={12} sm={12}>
          <div className="details-card">
            <div className="details-card-title">User Details</div>
            <div className="details-card-data">
              <Row className="p-0 m-0 details-data-row">
                <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">User Name</span>
                  <span className="data-value">{userData?.sUserName || '-'}</span>
                </Col>
                <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">Email ID</span>
                  <span className="data-value">{userData?.sEmail || 'Not Provided'}</span>
                </Col>

                <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">Status</span>
                  <span className="data-value">{userData?.eStatus === 'y' ? 'Active' : 'Inactive'}</span>
                </Col>
                <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">Total Chips Balance</span>
                  <span className="data-value"> {userData?.nChips?.toFixed(2) || 'No Data'}</span>
                </Col>
                <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">Created Date & Time </span>
                  <span className="data-value">{userData?.dCreatedDate ? moment(userData?.dCreatedDate).format('DD-MM-YYYY hh:mm:ss A') : '-'}</span>
                </Col>
                <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">Email Verified</span>
                  <span className="data-value">{userData?.isEmailVerified ? 'Yes' : 'No'}</span>
                </Col>
                <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">Total wins</span>
                  <span className="data-value">{userData?.nGameWon || 0}</span>
                </Col>

                <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">Total Losses</span>
                  <span className="data-value">{userData?.nGameLost || 0}</span>
                </Col>
                <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">Game Played</span>
                  <span className="data-value">{userData?.nGamePlayed || 0}</span>
                </Col>
                <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">Time Spent In Game</span>
                  <span className="data-value">{userData?.inGameTime ? moment.utc(userData.inGameTime * 1000).format('HH:mm:ss') : '00:00:00'}</span>
                </Col>
                {/* <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                  <span className="data-title">Time Spent In Website</span>
                  <span className="data-value">{userData?.inAppTime ? moment.utc(userData.inAppTime * 1000).format('HH:mm:ss') : '00:00:00'}</span>
                </Col> */}

                {/* <Col xxl={4} xl={4} lg={4} md={6} sm={6} className="p-0 m-0">
                                    <span className='data-title'>Gender</span>
                                    <span className='data-value'>{genderList?.find(item => item?.value === userData?.user?.eGender)?.name || '-'}</span>
                                </Col> */}
              </Row>
            </div>
          </div>
        </Col>
      </Row>
    </>
  )
}

export default UserDetails
