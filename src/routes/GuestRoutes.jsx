import React from 'react'
import PropTypes from 'prop-types'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import CommonLayout from 'layouts/common-layout'
import { getCookie } from 'shared/utils'

function GuestRoute() {
  const token = getCookie('sAuthToken')
  const location = useLocation()
  if (token) return <Navigate to='/lobby' replace />
  if (location.pathname === '/guest/game') return <Outlet />

  return (
    <CommonLayout>
      <Outlet />
    </CommonLayout>
  )
}

GuestRoute.propTypes = {
  element: PropTypes.element
}

export default GuestRoute
