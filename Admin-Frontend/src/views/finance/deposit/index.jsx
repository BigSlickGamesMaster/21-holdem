import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getDepositList, updateDepositById } from 'query/deposit/deposit.query'
import { Button, Form } from 'react-bootstrap'
import { Controller, useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useLocation } from 'react-router-dom'
import DataTable from 'shared/components/DataTable'
import { depositColumns } from 'shared/constants/TableHeaders'
import { appendParams, parseParams, ReactToastify } from 'shared/utils'

const DepositManagement = () => {
  const location = useLocation()
  const query = useQueryClient()
  const parsedData = parseParams(location.search)
  const params = useRef(parseParams(location.search))

  const { control, watch, setValue } = useForm({ mode: 'all' })

  function getSortedColumns(userTableColumns, urlData) {
    return userTableColumns?.map(column => (column.internalName === urlData?.sort ? { ...column, type: +urlData?.orderBy } : column))
  }

  function getRequestParams(e) {
    const data = e ? parseParams(e) : params.current
    return {
      pageNumber: +data?.pageNumber || 0,
      search: data?.search || '',
      size: data?.size || 10,
      eStatus: data.eStatus || '',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      sort: data.sort || '',
      orderBy: +data.orderBy === 1 ? 'ASC' : 'DESC',
    }
  }

  const columns = useMemo(() => getSortedColumns(depositColumns, parsedData), [parsedData])
  const [requestParams, setRequestParams] = useState(getRequestParams())
  const [depositList, setDepositList] = useState()
  const [amountID, setAmountID] = useState('')

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
  const { isLoading, isFetching } = useQuery(['depositList', requestParams], () => getDepositList(requestParams), {
    select: data => data.data.data,
    onSuccess: response => {
      setDepositList(response)
    },
  })

  // UPDATE DEPOSIT STATUS
  const { mutate } = useMutation(updateDepositById, {
    onSuccess: response => {
      query.invalidateQueries('depositList')
      ReactToastify(response?.data?.message, 'success')
      setValue(`nAmount_${amountID}`, '')
    },
  })

  const handleApproveBtn = id => {
    const fieldName = `nAmount_${id}`
    const nAmountValue = watch(fieldName)

    const approveData = {
      eStatus: 'Success',
      nAmount: +nAmountValue,
      id: id,
    }

    nAmountValue !== '' ? mutate(approveData) : ReactToastify('Please enter the Amount', 'warning', 'warning')
  }

  const handleRejectBtn = data => {
    const rejectData = {
      eStatus: 'Failed',
      id: data,
    }

    mutate(rejectData)
  }

  useEffect(() => {
    document.title = 'Deposit List | 21 Hold-em'
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
        totalRecord={depositList?.count?.[0]?.totalData || 0}
        pageChangeEvent={handlePageEvent}
        isLoading={isLoading || isFetching}
        pagination={{
          currentPage: requestParams.pageNumber,
          pageSize: requestParams.size,
        }}
      >
        {depositList?.Deposits?.map(({ _id, sUserName, iUserId, sTransactionId, nAmount, eStatus }, index) => {
          return (
            <>
              <tr key={_id}>
                <td>{index + 1}</td>
                <td>{iUserId || '-'}</td>
                <td>{sUserName || '-'}</td>
                <td>{sTransactionId || '-'}</td>
                <td>
                  <Form.Group>
                    <Controller
                      name={`nAmount_${_id}`}
                      control={control}
                      defaultValue={nAmount || ''}
                      rules={{
                        pattern: {
                          value: /^[0-9]+$/,
                          message: 'Only numbers are allowed',
                        },
                      }}
                      render={({ field: { onChange, value }, fieldState: { error } }) => (
                        <>
                          <Form.Control
                            type="text"
                            className={`form-control ${error ? 'is-invalid' : ''}`}
                            value={value}
                            onChange={e => {
                              setAmountID(index)
                              onChange(e.target.value)
                            }}
                            placeholder=""
                            isInvalid={!!error}
                          />
                          <Form.Control.Feedback type="invalid">{error?.message}</Form.Control.Feedback>
                        </>
                      )}
                    />
                  </Form.Group>
                </td>
                <td className="text-capitalize">
                  {eStatus ? <span className={eStatus === 'Success' ? 'success' : eStatus === 'Failed' ? 'rejected' : 'pending'}>{eStatus}</span> : '-'}
                </td>
                <td style={{ textAlign: 'center', textWrap: 'nowrap' }}>
                  <Button variant="success" type="button" className="square icon-btn me-2" onClick={() => handleApproveBtn(_id)}>
                    Approve
                  </Button>
                  <Button variant="danger" className="square icon-btn" onClick={() => handleRejectBtn(_id)}>
                    Reject
                  </Button>
                </td>
              </tr>
            </>
          )
        })}
      </DataTable>
    </div>
  )
}
export default DepositManagement
