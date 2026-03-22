import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getFinanceById, getWithdrawList } from 'query/finance/finance.query'
import { useQuery } from 'react-query'
import { useLocation } from 'react-router-dom'
import DataTable from 'shared/components/DataTable'
import WithdrawRow from 'shared/components/WithdrawRow'
import { withDrawColumns } from 'shared/constants/TableHeaders'
import { appendParams, parseParams } from 'shared/utils'

const Withdraw = () => {
  const location = useLocation()
  const params = useRef(parseParams(location.search))

  function getRequestParams(e) {
    const data = e ? parseParams(e) : params.current
    return {
      pageNumber: +data?.pageNumber || 1,
      search: data?.search || '',
      size: data?.size || 10,
      eStatus: data.eStatus || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      sort: data.sort || '',
      orderBy: +data.orderBy === 1 ? 'ASC' : 'DESC',
    }
  }

  const columns = useMemo(() => withDrawColumns, [])
  const [requestParams, setRequestParams] = useState(getRequestParams())
  const [financeList, setFinanceList] = useState()
  const [viewId, setViewId] = useState()
  const [withdrawalData, setWithdrawalData] = useState([])

  async function handleHeaderEvent(name, value) {
    switch (name) {
      case 'rows':
        setRequestParams({
          ...requestParams,
          size: Number(value),
          pageNumber: 1,
        })
        appendParams({ size: Number(value), pageNumber: 1 })
        break
      default:
        break
    }
  }

  function handlePageEvent(page) {
    setRequestParams({ ...requestParams, pageNumber: page })
    appendParams({ pageNumber: page })
  }

  // List
  const { isLoading, isFetching } = useQuery(['withdraw', requestParams], () => getWithdrawList(requestParams), {
    select: data => data.data.data,
    onSuccess: response => {
      setFinanceList(response)
    },
  })

  const onView = id => setViewId(id)

  // VIEW WITHDRAWAL
  useQuery(['viewById'], () => getFinanceById(viewId), {
    select: data => data.data.data,
    enabled: !!viewId,
    onSuccess: response => {
      setWithdrawalData(response)
    },
  })

  useEffect(() => {
    document.title = 'Withdrawal List | 21 Hold-em'
  }, [])

  return (
    <div className="withdrawal">
      <DataTable
        columns={columns}
        header={{
          left: {
            rows: true,
          },
          right: {
            search: false,
          },
        }}
        headerEvent={(name, value) => handleHeaderEvent(name, value)}
        totalRecord={financeList?.count[0]?.totalData || 0}
        pageChangeEvent={handlePageEvent}
        isLoading={isLoading || isFetching}
        pagination={{
          currentPage: requestParams.pageNumber,
          pageSize: requestParams.size,
        }}
      >
        {financeList?.withdrawalList?.map((list, index) => {
          return <WithdrawRow key={index} index={index} data={list} onView={onView} withdrawalData={withdrawalData} setViewId={setViewId} />
        })}
      </DataTable>
    </div>
  )
}
export default Withdraw
