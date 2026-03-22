import React from 'react'
import PropTypes from 'prop-types'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import MainLayout from 'layouts/main-layout'
import { setNav } from 'helper/helper'

function PrivateRoute () {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  const navigate = useNavigate()
  setNav(navigate)

  if (!token) return <Navigate to='/login' replace />

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  )
}
PrivateRoute.propTypes = {
  element: PropTypes.element
}

export default PrivateRoute
