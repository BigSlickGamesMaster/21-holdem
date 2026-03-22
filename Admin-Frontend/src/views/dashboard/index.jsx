/* eslint-disable no-unused-vars */
import { faGamepad, faMoneyBillWave, faUsers } from '@fortawesome/free-solid-svg-icons'
import { getTotalUserAndAdminWinning } from 'query/statistics/statistics.query'
import Wrapper from 'shared/components/Wrapper/index'
import { formatNumber } from 'helper/helper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState } from 'react'
import { Col, Row, Table } from 'react-bootstrap'
import { useQuery } from 'react-query'
import Cards from 'shared/components/Card'

function Dashboard() {
  const [totalUserAndAdminWinning, setTotalUserAndAdminWinning] = useState([])

  useQuery(['totalUserAndAdminWinning'], () => getTotalUserAndAdminWinning(), {
    select: data => data.data.data,
    onSuccess: response => {
      setTotalUserAndAdminWinning(response)
    },
  })

  useEffect(() => {
    document.title = 'Dashboard | 21 Hold-em'
  }, [])
  return (
    <div className="dashboard">
      <div className="">
        <Row>
          <Col xxl={12} lg={12} sm={12} md={12} className="m-0 pb-xxl-3 pb-lg-0 card-box">
            <h1>Users</h1>
            <Row>
              <Col xxl={3} lg={4} md={6}>
                <Cards cardtext={totalUserAndAdminWinning?.nTotalUsers ?? '0'} cardtitle="Total User" cardIcon={faUsers} className="card-1" />
              </Col>
              <Col xxl={3} lg={4} md={6}>
                <Cards cardtext={totalUserAndAdminWinning?.nTotalActiveUsers ?? '0'} cardtitle="Total Active User" cardIcon={faGamepad} className="card-2" />
              </Col>
              <Col xxl={3} lg={4} md={6}>
                <Cards cardtext={totalUserAndAdminWinning?.nTotalAdminWinAmount ?? '0'} cardtitle="Total Admin Winning" cardIcon={faMoneyBillWave} className="card-3" />
              </Col>
              {/* <Col xxl={3} lg={4} md={6}>
                <Cards cardtext={totalUserAndAdminWinning?.nTotalAdminWinGames ?? '0'} cardtitle="Total Admin Winning Games" cardIcon={faGamepad} className="card-4" />
              </Col> */}
            </Row>
            <h1 className="mt-4">Statistics</h1>
            <Row>
              <Col xxl={4} xl={4} lg={6} md={12} sm={12} className="">
                <Wrapper>
                  <div className="statistic-card">
                    <div className="card-header">
                      <div className="content-left">
                        <div className="top">
                          <FontAwesomeIcon icon={faGamepad} className="top-2" /> <span>Game Revenue</span>
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      <Table
                        // hover
                        // striped
                        bordered
                      >
                        <thead>
                          <tr>
                            <th></th>
                            <th>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Daily</td>
                            <td>{formatNumber(totalUserAndAdminWinning?.nTotalDailyRevenue) ?? '0'}</td>
                          </tr>
                          <tr>
                            <td>Monthly</td>
                            <td>{formatNumber(totalUserAndAdminWinning?.nTotalMonthlyRevenue) ?? '0'}</td>
                          </tr>
                          <tr>
                            <td>Yearly</td>
                            <td>{formatNumber(totalUserAndAdminWinning?.nTotalYearlyRevenue) ?? '0'}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  </div>
                </Wrapper>
              </Col>
              <Col xxl={4} xl={4} lg={6} md={12} sm={12} className="">
                <Wrapper>
                  <div className="statistic-card">
                    <div className="card-header">
                      <div className="content-left">
                        <div className="top">
                          <FontAwesomeIcon className="top-5" /> <span>User Transactions</span>
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      <Table
                        // hover
                        // striped
                        bordered
                      >
                        <thead>
                          <tr>
                            <th></th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Chips</td>
                            <td> {formatNumber(totalUserAndAdminWinning?.nTotalChipsAmount) ?? '0'}</td>
                          </tr>
                          <tr>
                            <td>Daily Rewards</td>
                            <td> {formatNumber(totalUserAndAdminWinning?.nTotalDailyRewardsAmount) ?? '0'}</td>
                          </tr>
                          <tr>
                            <td>Total</td>
                            <td> {formatNumber(totalUserAndAdminWinning?.nTotalChipsAmount + totalUserAndAdminWinning?.nTotalDailyRewardsAmount) ?? '0'}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </div>
                  </div>
                </Wrapper>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default Dashboard
