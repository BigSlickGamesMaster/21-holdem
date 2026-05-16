import { faArrowRightArrowLeft, faGamepad, faIndianRupee, faMoneyBillWave, faRobot, faUsers } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { formatNumber } from 'helper/helper'
import { getGameTransactions, getProfit, getStatisticsData } from 'query/statistics/statistics.query'
import React, { useEffect, useState } from 'react'
import { Col, Row, Table } from 'react-bootstrap'
import { useQuery } from 'react-query'
import Wrapper from 'shared/components/Wrapper'

const Statistics = () => {
  const [statisticsData, setStatisticsData] = useState([])
  const [gameTransaction, setGameTransaction] = useState([])
  const [profit, setProfit] = useState([])

  useQuery(['statisticsData'], () => getStatisticsData(), {
    select: data => data.data.data,
    onSuccess: response => {
      setStatisticsData(response)
    },
  })

  // GAME TRANSACTION
  useQuery(['gameTransaction'], () => getGameTransactions(), {
    select: data => data.data.data,
    onSuccess: response => {
      setGameTransaction(response)
    },
  })

  // GET PROFIT
  useQuery(['getProfit'], () => getProfit(), {
    select: data => data.data.data,
    onSuccess: response => {
      setProfit(response?.[0])
    },
  })

  useEffect(() => {
    document.title = 'Statistics | 21 Hold'em'
  }, [])
  return (
    <>
      <Row className="statistics">
        <Col xxl={3} xl={4} lg={6} md={6} sm={12}>
          <Wrapper>
            <div className="statistic-card">
              <div className="card-header">
                <div className="content-left">
                  <div className="top">
                    <FontAwesomeIcon icon={faUsers} className="top-1" /> <span>Users</span>
                  </div>
                  <div className="bottom">
                    <div className="">
                      <span>Balance: </span>
                      <span className="data-value"> {formatNumber(statisticsData?.nTotalUserBalance) ?? '0'}</span>
                    </div>
                    <div className="">
                      <span>Pending Withdrawals: </span>
                      <span className="data-value"> {formatNumber(statisticsData?.nUserPending) ?? '0'}</span>
                    </div>
                  </div>
                </div>
                <div className="content-right">{statisticsData?.nTotalUsers ?? '0'}</div>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div className="data-label">Registered Users</div>
                  <div className="data-value">{statisticsData?.nTotalUsers ?? '0'}</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="data-label">Deleted Users</div>
                  <div className="data-value">{statisticsData?.nTotalDeletedUsers ?? '0'}</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="data-label">Mobile Verified</div>
                  <div className="data-value">{statisticsData?.nTotalMobileVerifiedUsers ?? '0'}</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="data-label">Email Verified</div>
                  <div className="data-value">{statisticsData?.nTotalEmailVerifiedUsers ?? '0'}</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="data-label">KYC Verified</div>
                  <div className="data-value">{statisticsData?.nTotalKYC ?? '0'}</div>
                </div>
              </div>
            </div>
          </Wrapper>
        </Col>
        <Col xxl={3} xl={4} lg={6} md={6} sm={12} className="mt-md-0 mt-3">
          <Wrapper>
            <div className="statistic-card">
              <div className="card-header">
                <div className="content-left">
                  <div className="top">
                    <FontAwesomeIcon icon={faRobot} className="top-2" /> <span>Bots</span>
                  </div>
                  <div className="bottom">
                    <div className="">
                      <span>Balance: </span>
                      <span className="data-value"> {formatNumber(statisticsData?.nTotalBotBalance) ?? '0'}</span>
                    </div>
                  </div>
                </div>
                <div className="content-right">{statisticsData?.nTotalActiveBot ?? '0'}</div>
              </div>
              <div className="card-body">
                {/* <div className='d-flex justify-content-between'>
                  <div className='data-label'>Free Bot</div>
                  <div className='data-value'>-</div>
                </div>
                <div className='d-flex justify-content-between'>
                  <div className='data-label'>Busy Bot</div>
                  <div className='data-value'>-</div>
                </div> */}
                <div className="d-flex justify-content-between">
                  <div className="data-label">Active Bots</div>
                  <div className="data-value">{statisticsData?.nTotalActiveBot ?? '0'}</div>
                </div>
              </div>
            </div>
          </Wrapper>
        </Col>
        <Col xxl={3} xl={4} lg={6} md={6} sm={12} className="mt-xl-0 mt-3">
          <Wrapper>
            <div className="statistic-card">
              <div className="card-header">
                <div className="content-left">
                  <div className="top">
                    <FontAwesomeIcon icon={faIndianRupee} className="top-3" /> <span>Balance</span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div className="data-label">Total Deposit</div>
                  <div className="data-value">{formatNumber(statisticsData?.nTotalDeposit) ?? '0'}</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="data-label">Total Withdrawal</div>
                  <div className="data-value">{formatNumber(statisticsData?.nTotalWithdrawal) ?? '0'}</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="data-label">Admin Credit</div>
                  <div className="data-value">{formatNumber(statisticsData?.nAdminCredit) ?? '0'}</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="data-label">Admin Debit</div>
                  <div className="data-value">{formatNumber(statisticsData?.nAdminDebit) ?? '0'}</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="data-label">User Credit</div>
                  <div className="data-value">{formatNumber(statisticsData?.nUserCredit) ?? '0'}</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="data-label">User Debit</div>
                  <div className="data-value">{formatNumber(statisticsData?.nUserDebit) ?? '0'}</div>
                </div>
              </div>
            </div>
          </Wrapper>
        </Col>
        <Col xxl={3} xl={4} lg={6} md={6} sm={12} className="mt-xxl-0 mt-xl-3 mt-3">
          <Wrapper>
            <div className="statistic-card">
              <div className="card-header">
                <div className="content-left">
                  <div className="top">
                    <FontAwesomeIcon icon={faGamepad} className="top-4" /> <span>Game Tables</span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <Table hover striped bordered>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Finished</th>
                      <th>Running</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Classic</td>
                      <td>{statisticsData?.nTotalClassicFinishedGame ?? '0'}</td>
                      <td>{statisticsData?.nTotalClassicRunningGame ?? '0'}</td>
                    </tr>
                    {/* <tr>
                      <td>Rush</td>
                      <td>{statisticsData?.nTotalRushFinishedGame ?? '0'}</td>
                      <td>{statisticsData?.nTotalRushRunningGame ?? '10'}</td>
                    </tr> */}
                    <tr>
                      <td>Total</td>
                      <td>{statisticsData?.nTotalFinishedGames ?? '0'}</td>
                      <td>{statisticsData?.nTotalRunningGames ?? '0'}</td>
                    </tr>
                  </tbody>
                </Table>
              </div>
            </div>
          </Wrapper>
        </Col>
        <Col xxl={3} xl={4} lg={6} md={6} sm={12} className="mt-xxl-3 mt-xl-3 mt-3">
          <Wrapper>
            <div className="statistic-card">
              <div className="card-header">
                <div className="content-left">
                  <div className="top">
                    <FontAwesomeIcon icon={faArrowRightArrowLeft} className="top-5" /> <span>Game Transactions</span>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <Table hover striped bordered>
                  <thead>
                    <tr>
                      <th></th>
                      <th>IN</th>
                      <th>OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Classic</td>
                      <td> {formatNumber(gameTransaction?.nTotalClassicInAmount) ?? '0'}</td>
                      <td> {formatNumber(gameTransaction?.nTotalClassicOutAmount) ?? '0'}</td>
                    </tr>
                    {/* <tr>
                      <td>Rush</td>
                      <td> {formatNumber(gameTransaction?.nTotalRushInAmount) ?? '0'}</td>
                      <td> {formatNumber(gameTransaction?.nTotalRushOutAmount) ?? '10'}</td>
                    </tr> */}
                    <tr>
                      <td>Total</td>
                      <td> {formatNumber(gameTransaction?.totalInAmount) ?? '0'}</td>
                      <td> {formatNumber(gameTransaction?.totalOutAmount) ?? '0'}</td>
                    </tr>
                  </tbody>
                </Table>
              </div>
            </div>
          </Wrapper>
        </Col>
        <Col xxl={3} xl={4} lg={6} md={6} sm={12} className="mt-xxl-3 mt-xl-3 mt-3">
          <Wrapper>
            <div className="statistic-card">
              <div className="card-header d-block">
                <div className="content-left">
                  <div className="top">
                    <FontAwesomeIcon icon={faMoneyBillWave} className="top-1" /> <span>Profit</span>
                  </div>
                  <div className="bottom">
                    <div className="">
                      <span className="me-2">Game Profit: </span>
                      <span className="data-value"> {formatNumber(profit?.userProfit) ?? '0'}</span>
                    </div>
                    <div className="">
                      <span className="me-2">Bot Profit: </span>
                      <span className="data-value"> {formatNumber(profit?.botProfit) ?? '0'}</span>
                    </div>
                    <div className="">
                      <span className="me-2">Admin Profit: </span>
                      <span className="data-value"> {formatNumber(gameTransaction?.nTotalAdminProfit) ?? '0'}</span>
                    </div>
                    {/* <hr className='my-2' />
                    <div className=''>
                      <span className='me-2'>Total Profit: </span><span className='data-value'> {formatNumber(profit?.totalGameProfit) ?? '0'}</span>
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
          </Wrapper>
        </Col>
      </Row>
    </>
  )
}

export default Statistics
