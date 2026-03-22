import React, { Suspense, useState } from 'react'
import PropTypes from 'prop-types'

import Header from 'shared/components/Header'
import SideBar from 'shared/components/Sidebar'
import Breadcrumbs from 'shared/components/Breadcrumb'
import { Loader } from 'shared/components/Loader'
import useMediaQuery from 'shared/hooks/useMediaQuery'

function MainLayout ({ children }) {
  const [isOpen, setIsOpen] = useState(true)
  const width = useMediaQuery('(max-width: 800px)')
  return (
    <div className='main-layout'>
      <Header isOpen={isOpen} />
      <SideBar isOpen={isOpen} setIsOpen={setIsOpen} />
      <div className={`main-container ${width ? !isOpen && 'active' : isOpen && 'active'}`}>
        <div className='container-fluid'>
          <Breadcrumbs />
          <Suspense fallback={<Loader />}>{children}</Suspense>
        </div>
      </div>
    </div>
  )
}
MainLayout.propTypes = {
  children: PropTypes.node.isRequired
}
export default MainLayout
