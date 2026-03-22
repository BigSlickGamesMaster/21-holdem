/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from 'react'
import { getKycList } from 'query/kyc/kyc.query'
import { useQuery } from 'react-query'
import { useLocation } from 'react-router-dom'
import DataTable from 'shared/components/DataTable'
import KYCRow from 'shared/components/KYCRow'
import { KYCVerificationListColumn } from 'shared/constants/TableHeaders'
import { appendParams, parseParams } from 'shared/utils'

const KycDetails = () => {
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

  const [columns, setColumns] = useState(getSortedColumns(KYCVerificationListColumn, parsedData))
  const [requestParams, setRequestParams] = useState(getRequestParams())
  const [kycList, setKYCList] = useState()

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

  //* KYC VERIFICATION List
  const { isLoading, isFetching } = useQuery(['kycList', requestParams], () => getKycList(requestParams), {
    select: data => data.data.data,
    onSuccess: response => {
      setKYCList(response?.[0])
    },
  })

  // VIEW TRANSACTION
  // useQuery(['viewById'], () => getFinanceById(viewId), {
  //     select: (data) => data.data.data,
  //     enabled: !!viewId,
  //     onSuccess: (response) => {
  //         setTransactionData(response)
  //     },
  // })

  useEffect(() => {
    document.title = 'KYC Verification List | 21 Hold-em'
  }, [])

  return (
    <div className="kyc-list">
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
        totalRecord={kycList?.count[0]?.totalData || 0}
        pageChangeEvent={handlePageEvent}
        isLoading={isLoading || isFetching}
        pagination={{
          currentPage: requestParams.pageNumber,
          pageSize: requestParams.size,
        }}
      >
        {kycList?.data?.map((kyc, index) => {
          return <KYCRow key={index} index={index} data={kyc} />
        })}
      </DataTable>
    </div>
  )
}
export default KycDetails
