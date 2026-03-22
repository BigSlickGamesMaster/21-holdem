/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getFinanceById, getFinanceList } from 'query/finance/finance.query'
import { useQuery } from 'react-query'
import { useLocation } from 'react-router-dom'
import DataTable from 'shared/components/DataTable'
import FinanceRow from 'shared/components/FinanceRow'
import { financeColumns } from 'shared/constants/TableHeaders'
import { appendParams, parseParams } from 'shared/utils'
import TransactionFilter from 'shared/components/TransactionFilter'

const FinanceManagement = () => {
  const location = useLocation()
  const parsedData = parseParams(location.search)
  const params = useRef(parseParams(location.search))

  function getSortedColumns(userTableColumns, urlData) {
    return userTableColumns?.map(column => (column.internalName === urlData?.sort ? { ...column, type: +urlData?.orderBy } : column))
  }

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

  const columns = useMemo(() => getSortedColumns(financeColumns, parsedData), [parsedData])
  const [requestParams, setRequestParams] = useState(getRequestParams())
  const [financeList, setFinanceList] = useState()
  const [viewId, setViewId] = useState()
  const [transactionData, setTransactionData] = useState([])

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
      case 'search':
        setRequestParams({ ...requestParams, search: value, pageNumber: 1 })
        appendParams({ pageNumber: 1 })
        break
      default:
        break
    }
  }

  function handlePageEvent(page) {
    setRequestParams({ ...requestParams, pageNumber: page })
    // appendParams({ pageNumber: page })
  }

  // List
  const { isLoading, isFetching } = useQuery(['finance', requestParams], () => getFinanceList(requestParams), {
    select: data => data.data.data,
    onSuccess: response => {
      setFinanceList(response[0])
    },
  })

  const onView = id => setViewId(id)

  // VIEW TRANSACTION
  useQuery(['viewById'], () => getFinanceById(viewId), {
    select: data => data.data.data,
    enabled: !!viewId,
    onSuccess: response => {
      setTransactionData(response)
    },
  })

  useEffect(() => {
    document.title = 'Transaction List | 21 Hold-em'
  }, [])

  return (
    <div className="withdrawal">
      <DataTable
        columns={columns}
        header={{
          left: {
            rows: true,
            search: true,
          },
          right: {
            component: true,
          },
        }}
        component={<TransactionFilter requestParams={requestParams} setRequestParams={setRequestParams} />}
        headerEvent={(name, value) => handleHeaderEvent(name, value)}
        totalRecord={financeList?.count?.totalData || 0}
        pageChangeEvent={handlePageEvent}
        isLoading={isLoading || isFetching}
        pagination={{
          currentPage: requestParams.pageNumber,
          pageSize: requestParams.size,
        }}
      >
        {financeList?.transactions?.map((list, index) => {
          return <FinanceRow key={index} index={index} data={list} onView={onView} transactionData={transactionData} setViewId={setViewId} />
        })}
      </DataTable>
    </div>
  )
}
export default FinanceManagement
