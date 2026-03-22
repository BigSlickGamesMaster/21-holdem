import { formatNumber } from 'helper/helper'
import { getDepositData, getWithdrawalData } from 'query/transaction/transaction.query'
import React, { useEffect, useState } from 'react'
import { useQuery } from 'react-query'

const TransactionStats = () => {
  const [withdrawalData, setWithdrawalData] = useState([])
  const [depositData, setDepositData] = useState([])

  useQuery(['withdrawalData'], () => getWithdrawalData(), {
    select: data => data.data.data,
    onSuccess: response => {
      setWithdrawalData(response)
    },
  })

  useQuery(['depositData'], () => getDepositData(), {
    select: data => data.data.data,
    onSuccess: response => {
      setDepositData(response)
    },
  })

  useEffect(() => {
    document.title = 'Transaction Stats | 21 Hold-em'
  }, [])

  return (
    <div className="transaction-stats">
      <div className="data-box-grp">
        <div className="data-box">
          <div className="data-box_top box-1">
            <div className="data-box__title">Approved Withdrawal</div>
            <div className="data-box__value"> {formatNumber(withdrawalData?.nOverall?.[0]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
            <div className="data-box__request">{withdrawalData?.nOverall?.[0]?.nTotal ?? '0'} Request</div>
          </div>
          <div className="data-box_bottom">
            <div className="data-box_revenue">
              <div className="data-box__title">Today</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nToday?.[0]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nToday?.[0]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Weekly</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nLastweek?.[0]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nLastweek?.[0]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Monthly</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nLastMonth?.[0]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nLastMonth?.[0]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Yearly</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nLastYear?.[0]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nLastYear?.[0]?.nTotal ?? '0'} Request</div>
            </div>
          </div>
        </div>
        <div className="data-box">
          <div className="data-box_top box-2">
            <div className="data-box__title">Pending Withdrawal</div>
            <div className="data-box__value"> {formatNumber(withdrawalData?.nOverall?.[2]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
            <div className="data-box__request">{withdrawalData?.nOverall?.[2]?.nTotal ?? '0'} Request</div>
          </div>
          <div className="data-box_bottom">
            <div className="data-box_revenue">
              <div className="data-box__title">Today</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nToday?.[2]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nToday?.[2]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Weekly</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nLastweek?.[2]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nLastweek?.[2]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Monthly</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nLastMonth?.[2]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nLastMonth?.[2]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Yearly</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nLastYear?.[2]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nLastYear?.[2]?.nTotal ?? '0'} Request</div>
            </div>
          </div>
        </div>
        <div className="data-box">
          <div className="data-box_top box-3">
            <div className="data-box__title">Rejected Withdrawal</div>
            <div className="data-box__value"> {formatNumber(withdrawalData?.nOverall?.[3]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
            <div className="data-box__request">{withdrawalData?.nOverall?.[3]?.nTotal ?? '0'} Request</div>
          </div>
          <div className="data-box_bottom">
            <div className="data-box_revenue">
              <div className="data-box__title">Today</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nToday?.[3]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nToday?.[3]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Weekly</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nLastweek?.[3]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nLastweek?.[3]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Monthly</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nLastMonth?.[3]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nLastMonth?.[3]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Yearly</div>
              <div className="data-box__value"> {formatNumber(withdrawalData?.nLastYear?.[3]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{withdrawalData?.nLastYear?.[3]?.nTotal ?? '0'} Request</div>
            </div>
          </div>
        </div>
      </div>
      <div className="data-box-grp">
        <div className="data-box">
          <div className="data-box_top box-1">
            <div className="data-box__title">Approved Deposit</div>
            <div className="data-box__value"> {formatNumber(depositData?.nOverall?.[0]?.nTotalDeposit?.toFixed(2)) ?? '0.00'}</div>
            <div className="data-box__request">{depositData?.nOverall?.[0]?.nTotal ?? '0'} Request</div>
          </div>
          <div className="data-box_bottom">
            <div className="data-box_revenue">
              <div className="data-box__title">Today</div>
              <div className="data-box__value"> {formatNumber(depositData?.nToday?.[0]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nToday?.[0]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Weekly</div>
              <div className="data-box__value"> {formatNumber(depositData?.nLastWeek?.[0]?.nTotalDeposit?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nLastWeek?.[0]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Monthly</div>
              <div className="data-box__value"> {formatNumber(depositData?.nLastMonth?.[0]?.nTotalDeposit?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nLastMonth?.[0]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Yearly</div>
              <div className="data-box__value"> {formatNumber(depositData?.nLastYear?.[0]?.nTotalDeposit?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nLastYear?.[0]?.nTotal ?? '0'} Request</div>
            </div>
          </div>
        </div>
        <div className="data-box">
          <div className="data-box_top box-2">
            <div className="data-box__title">Pending Deposit</div>
            <div className="data-box__value"> {formatNumber(depositData?.nOverall?.[2]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
            <div className="data-box__request">{depositData?.nOverall?.[2]?.nTotal ?? '0'} Request</div>
          </div>
          <div className="data-box_bottom">
            <div className="data-box_revenue">
              <div className="data-box__title">Today</div>
              <div className="data-box__value"> {formatNumber(depositData?.nToday?.[2]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nToday?.[2]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Weekly</div>
              <div className="data-box__value"> {formatNumber(depositData?.nLastWeek?.[2]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nLastWeek?.[2]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Monthly</div>
              <div className="data-box__value"> {formatNumber(depositData?.nLastMonth?.[2]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nLastMonth?.[2]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Yearly</div>
              <div className="data-box__value"> {formatNumber(depositData?.nLastYear?.[2]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nLastYear?.[2]?.nTotal ?? '0'} Request</div>
            </div>
          </div>
        </div>
        <div className="data-box">
          <div className="data-box_top box-3">
            <div className="data-box__title">Rejected Deopsit</div>
            <div className="data-box__value"> {formatNumber(depositData?.nOverall?.[1]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
            <div className="data-box__request">{depositData?.nOverall?.[1]?.nTotal ?? '0'} Request</div>
          </div>
          <div className="data-box_bottom">
            <div className="data-box_revenue">
              <div className="data-box__title">Today</div>
              <div className="data-box__value"> {formatNumber(depositData?.nToday?.[1]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nToday?.[1]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Weekly</div>
              <div className="data-box__value"> {formatNumber(depositData?.nLastWeek?.[1]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nLastWeek?.[1]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Monthly</div>
              <div className="data-box__value"> {formatNumber(depositData?.nLastMonth?.[1]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nLastMonth?.[1]?.nTotal ?? '0'} Request</div>
            </div>
            <div className="data-box_revenue">
              <div className="data-box__title">Yearly</div>
              <div className="data-box__value"> {formatNumber(depositData?.nLastYear?.[1]?.nTotalWithdrawal?.toFixed(2)) ?? '0.00'}</div>
              <div className="data-box__request">{depositData?.nLastYear?.[1]?.nTotal ?? '0'} Request</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionStats
