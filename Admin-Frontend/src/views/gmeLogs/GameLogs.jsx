/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getGameLogs } from 'query/gameLogs/gameLogs.query'
import { useQuery } from 'react-query'
import { useLocation } from 'react-router-dom'
import DataTable from 'shared/components/DataTable'
import LogsRow from 'shared/components/LogsRow'
import { gameLogs } from 'shared/constants/TableHeaders'
import { appendParams, parseParams } from 'shared/utils'
import GameLogsFilter from 'shared/components/GameLogsFilter'

function GameLogs() {
  const location = useLocation()
  const params = useRef(parseParams(location.search))

  // function getSortedColumns (userTableColumns, urlData) {
  //   return userTableColumns?.map((column) => (column.internalName === urlData?.sort ? { ...column, type: +urlData?.orderBy } : column))
  // }

  function getRequestParams(e) {
    const data = e ? parseParams(e) : params.current
    return {
      pageNumber: +data?.pageNumber || 1,
      search: data?.search || '',
      size: data?.size || 10,
      eBoardType: data.eBoardType || '',
      dStartDate: data.dStartDate || '',
      dEndDate: data.dEndDate || '',
      sort: data.sort || '',
      orderBy: +data.orderBy === 1 ? 'ASC' : 'DESC',
    }
  }

  const columns = useMemo(() => gameLogs, [])
  const [requestParams, setRequestParams] = useState(getRequestParams())
  const [logs, setLogs] = useState([])

  // List
  const { isLoading, isFetching } = useQuery(['gameLogs', requestParams], () => getGameLogs(requestParams), {
    select: data => data.data.data,
    onSuccess: response => {
      setLogs(response)
    },
  })

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

  useEffect(() => {
    document.title = 'Game Logs | 21 Hold-em'
  }, [])

  return (
    <>
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
        headerEvent={(name, value) => handleHeaderEvent(name, value)}
        totalRecord={logs?.count?.totalData ?? 0}
        pageChangeEvent={handlePageEvent}
        isLoading={isLoading || isFetching}
        pagination={{
          currentPage: requestParams.pageNumber,
          pageSize: requestParams.size,
        }}
        component={<GameLogsFilter requestParams={requestParams} setRequestParams={setRequestParams} />}
      >
        {logs &&
          logs?.tables?.map((table, i) => {
            return <LogsRow data={table} index={i} key={table?._id} />
          })}
      </DataTable>
    </>
  )
}

export default GameLogs
