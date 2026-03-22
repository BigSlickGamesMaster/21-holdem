/* eslint-disable no-unused-vars */
// import { changeUserStatus, deleteUser } from "query/user/user.query";
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import DataTable from 'shared/components/DataTable'
import CustomModal from 'shared/components/Modal'
import TopBar from 'shared/components/Topbar'
import ProtoRow from 'shared/components/ProtoRow'
import { route } from 'shared/constants/AllRoutes'
import { protoTableColumns } from 'shared/constants/TableHeaders'
import { ReactToastify, appendParams, parseParams } from 'shared/utils'
import { getProtoList, deleteProto, changeProtoStatus } from 'query/proto/user.proto'
import UserFilter from 'shared/components/userFilter'

const CONSTANT = {
  DOC_TITLE: 'Table Management | 21 Hold-em',
  CREATE_TABLE: 'Create Table',
  ADD_ICON: 'icon-add',
  TYPE: 'primary',
  DELETE_MESSAGE: 'Are you sure, you want to delete the',
  DELETE_SUBTITLE_MESSAGE: '(Once deleted you can not recover this Table again.)',
}

function ProtoManagement() {
  const query = useQueryClient()
  const navigate = useNavigate()
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

  // function getSortedColumns (userTableColumns, urlData) {
  // 	return userTableColumns?.map((column) => (column.internalName === urlData?.sort ? { ...column, type: +urlData?.orderBy } : column))
  // }

  useEffect(() => {
    if (location?.state?.updatedTableLocation) {
      setRequestParams({
        ...requestParams,
        pageNumber: location?.state?.updatedTableLocation,
      })
    }
  }, [location])

  const columns = useMemo(() => protoTableColumns, [])
  const [requestParams, setRequestParams] = useState(getRequestParams())
  const [protoList, setProtoList] = useState([])
  const [show, setShow] = useState(false)
  const [deleteId, setDeleteId] = useState()
  const [deleteName, setDeleteName] = useState()

  // List
  const { isLoading, isFetching } = useQuery(['admins', requestParams], () => getProtoList(requestParams), {
    select: data => data.data.data[0],
    onSuccess: response => {
      setProtoList(response)
    },
  })

  // Delete
  const { isLoading: deleteLoading, mutate } = useMutation(deleteProto, {
    onSuccess: res => {
      query.invalidateQueries('admins')
      ReactToastify('Table Deleted Successfully.', 'success')
      setShow(!show)
    },
  })

  // Status
  const { mutate: statusMutation } = useMutation(changeProtoStatus, {
    onSuccess: response => {
      ReactToastify('Table Status Updated Successfully.', 'success')
      query.invalidateQueries('admins')
    },
  })

  // function handleSort (field) {
  // 	let selectedFilter
  // 	const filter = columns.map((data) => {
  // 		if (data.internalName === field.internalName) {
  // 			data.type = +data.type === 1 ? -1 : 1
  // 			selectedFilter = data
  // 		} else {
  // 			data.type = 1
  // 		}
  // 		return data
  // 	})
  // 	setColumns(filter)
  // 	const params = {
  // 		...requestParams,
  // 		page: 0,
  // 		sort: selectedFilter?.internalName,
  // 		orderBy: selectedFilter.type === 1 ? 'ASC' : 'DESC',
  // 	}
  // 	setRequestParams(params)
  // 	appendParams({
  // 		sort: selectedFilter.type !== 0 ? selectedFilter.internalName : '',
  // 		orderBy: selectedFilter.type,
  // 	})
  // }

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

  const onDelete = (id, name) => {
    setShow(!show)
    setDeleteId(id)
    setDeleteName(name)
  }

  const handleStatusUpdateUser = (id, status) => statusMutation({ id, eStatus: status ? 'y' : 'n' })
  const handleConfirmDelete = id => mutate(id)
  const handleClose = () => setShow(false)

  useEffect(() => {
    document.title = CONSTANT.DOC_TITLE
  }, [])

  return (
    <>
      <TopBar
        buttons={[
          {
            text: CONSTANT.CREATE_TABLE,
            icon: CONSTANT.ADD_ICON,
            type: CONSTANT.TYPE,
            clickEventName: 'createAdmin',
          },
        ]}
        btnEvent={() => navigate(route.addProto)}
      />
      <div>
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
          totalRecord={protoList?.count?.totalData || 0}
          pageChangeEvent={handlePageEvent}
          component={<UserFilter requestParams={requestParams} setRequestParams={setRequestParams} />}
          isLoading={isLoading || isFetching}
          pagination={{
            currentPage: requestParams.pageNumber,
            pageSize: requestParams.size,
          }}
        >
          {protoList?.prototypes?.map((proto, index) => {
            {
              return <ProtoRow key={proto._id} index={index} proto={proto} onStatusChange={handleStatusUpdateUser} onDelete={onDelete} requestParams={requestParams} />
            }
          })}
        </DataTable>

        <CustomModal
          open={show}
          handleClose={handleClose}
          handleConfirm={handleConfirmDelete}
          disableHeader
          bodyTitle="Confirm Delete?"
          isLoading={deleteLoading}
          confirmValue={deleteId}
        >
          <article>
            <h5>
              <div>
                {CONSTANT.DELETE_MESSAGE} <b style={{ color: 'red' }}> {deleteName}</b> ?
              </div>
              <h6>{CONSTANT.DELETE_SUBTITLE_MESSAGE}</h6>
            </h5>
          </article>
        </CustomModal>
      </div>
    </>
  )
}

export default ProtoManagement
