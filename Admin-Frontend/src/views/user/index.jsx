/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from 'react'
import { changeUserStatus, deleteUser, getUserList } from 'query/user/user.query'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import DataTable from 'shared/components/DataTable'
import CustomModal from 'shared/components/Modal'
import TopBar from 'shared/components/Topbar'
import UserRow from 'shared/components/UserRow'
import { route } from 'shared/constants/AllRoutes'
import { userTableColumns } from 'shared/constants/TableHeaders'
import { ReactToastify, appendParams, parseParams } from 'shared/utils'
import UserFilter from 'shared/components/userFilter'
import Skeleton from 'react-loading-skeleton'
import { Table } from 'react-bootstrap'

function UserManagement() {
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

  const [columns, setColumns] = useState(userTableColumns)
  const [requestParams, setRequestParams] = useState(getRequestParams())
  const [userList, setUserList] = useState([])
  const [show, setShow] = useState(false)
  const [deleteId, setDeleteId] = useState()
  const [deleteName, setDeleteName] = useState()

  useEffect(() => {
    if (location?.state?.updatedUserLocation) {
      setRequestParams({
        ...requestParams,
        pageNumber: location?.state?.updatedUserLocation,
      })
    }
  }, [location])

  // List
  const { isLoading, isFetching } = useQuery(['admins', requestParams], () => getUserList(requestParams), {
    select: data => data.data.data,
    onSuccess: response => {
      setUserList(response[0])
    },
  })

  // Delete
  const { isLoading: deleteLoading, mutate } = useMutation(deleteUser, {
    onSuccess: res => {
      query.invalidateQueries('admins')
      ReactToastify('User Deleted Successfully.', 'success', 'deleted')
      setShow(!show)
    },
  })

  // Status
  const { mutate: statusMutaion, isLoading: statusLoading } = useMutation(changeUserStatus, {
    onSuccess: response => {
      ReactToastify('User Status Updated Successfully.', 'success')
      query.invalidateQueries('admins')
    },
    onError: error => {
      ReactToastify(error.message, 'error')
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

  const onDelete = (id, name) => {
    setShow(!show)
    setDeleteId(id)
    setDeleteName(name)
  }

  const handleStatusUpdateUser = (id, status) => statusMutaion({ id, eStatus: status ? 'y' : 'n' })
  const handleConfirmDelete = id => mutate(id)
  const handleClose = () => setShow(false)

  useEffect(() => {
    document.title = 'User Management | 21 Hold-em'
  }, [])

  return (
    <>
      <TopBar
        buttons={[
          {
            text: 'Create User',
            icon: 'icon-add',
            type: 'primary',
            clickEventName: 'createAdmin',
          },
        ]}
        btnEvent={() => navigate(route.addUser)}
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
          component={<UserFilter requestParams={requestParams} setRequestParams={setRequestParams} />}
          headerEvent={(name, value) => handleHeaderEvent(name, value)}
          totalRecord={userList?.count?.totalData || 0}
          pageChangeEvent={handlePageEvent}
          isLoading={isLoading || isFetching}
          pagination={{
            currentPage: requestParams.pageNumber,
            pageSize: requestParams.size,
          }}
        >
          {userList?.users?.map((users, index) => {
            return (
              <UserRow
                key={users._id}
                index={index}
                user={users}
                onStatusChange={handleStatusUpdateUser}
                statusLoading={statusLoading}
                onDelete={onDelete}
                requestParams={requestParams}
              />
            )
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
                Are you sure, you want to delete the <b style={{ color: 'red' }}> {deleteName}</b> ?
              </div>
              <h6>(Once deleted you can not recover this user and his data)</h6>
            </h5>
          </article>
        </CustomModal>
      </div>
    </>
  )
}

export default UserManagement
