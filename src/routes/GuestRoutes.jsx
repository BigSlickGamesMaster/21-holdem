import React from 'react'
import PropTypes from 'prop-types'
import { Outlet, useLocation } from 'react-router-dom'
import CommonLayout from 'layouts/common-layout'

function GuestRoute() {
  const location = useLocation()
  if (location.pathname === '/guest/game' || location.pathname === '/guest/tutorial/game') return <Outlet />

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
