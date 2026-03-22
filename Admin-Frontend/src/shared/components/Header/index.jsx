/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useCallback, useState } from 'react'
import { Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from 'react-query'
import { logout } from 'query/auth/auth.query'
import { route } from 'shared/constants/AllRoutes'
import CustomModal from 'shared/components/Modal'
import UserIcon from 'assets/images/User'
import { profile } from 'query/profile/profile.query'
import { getGreeting, ReactToastify } from 'shared/utils'
import logo from 'assets/images/logo/logo.png'
import mainlogo from 'assets/images/logo/logo-main.png'

function Header({ isOpen }) {
  const navigate = useNavigate()
  const query = useQueryClient()

  const [show, setShow] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [clickedLogOut, setClickedLogOut] = useState(false)

  //! LOGOUT API
  const { isLoading, isFetching } = useQuery('logoutUser', () => logout(), {
    enabled: clickedLogOut,
    onSuccess: res => {
      localStorage.clear()
      navigate('/login')
      ReactToastify(res?.data?.message, 'success')
    },
    onError: () => {
      localStorage.clear()
      navigate('/login')
    },
  })

  //* PROFILE API
  useQuery('profile', () => profile(), {
    select: data => data?.data?.data,
    onSettled: (data, error) => {
      data ? setProfileName(data.sUserName) : setProfileName('')
    },
  })

  const handleConfirmLogout = () => {
    setClickedLogOut(true)
    query.invalidateQueries('logoutUser')
  }

  const handleClose = useCallback(() => setShow(false), [])
  const handleLogout = useCallback(() => setShow(!show), [show])
  const handleEditProfile = useCallback(() => navigate(route.editProfile), [navigate])
  const handleChangePass = useCallback(() => navigate(route.changePassword), [navigate])

  return (
    <header className="header">
      <div className="header-left">
        <Link className={`logo ${isOpen ? 'expanded' : ''}`} to={route.dashboard}>
          {isOpen ? <img src={logo} className="logoIcon" alt="21 Hold-em" /> : <img src={logo} className="logoIcon" alt="21 Hold-em" />}
          {/* <div className="logo-text">21 Hold-em</div> */}
        </Link>
      </div>
      <div className="header-right">
        <div className="user-name">
          {getGreeting()}, {profileName}
        </div>
        <Dropdown>
          <OverlayTrigger placement="bottom" delay={{ show: 250, hide: 400 }} overlay={<Tooltip>Manage Profile</Tooltip>}>
            <Dropdown.Toggle className="header-btn">
              <div className="img d-flex align-items-center justify-content-center">
                <UserIcon />
              </div>
            </Dropdown.Toggle>
          </OverlayTrigger>
          <Dropdown.Menu className="up-arrow">
            <Dropdown.Item onClick={handleEditProfile}>
              <i className="icon-account"></i>
              My Profile
            </Dropdown.Item>
            <Dropdown.Item onClick={handleChangePass}>
              <i className="icon-lock"></i>
              Change Password
            </Dropdown.Item>
            <Dropdown.Item onClick={() => handleLogout()}>
              <i className="icon-logout"></i>
              Logout
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
      <CustomModal
        open={show}
        handleClose={handleClose}
        handleConfirm={handleConfirmLogout}
        disableHeader
        bodyTitle="Are you sure you want to logout ?"
        isLoading={isLoading || isFetching}
      />
    </header>
  )
}

export default Header
