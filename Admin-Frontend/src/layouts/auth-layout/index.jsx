import React, { Suspense } from 'react'
import PropTypes from 'prop-types'
import LoginCharacter from 'assets/images/loginCharacter'

function AuthLayout ({ children }) {
  return (
    <div className='auth-main'>
      <div className='child-box-second'>
        <div className='login-svg'>
          <LoginCharacter />
        </div>
        <Suspense fallback={<div>Loading ...</div>}>{children}</Suspense>
      </div>
    </div>
  )
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired
}

export default AuthLayout
