/* eslint-disable react/prop-types */
import React, { useState } from 'react'
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { sidebarConfig } from './SidebarConfig'
import MenuItem from './MenuItem'
import useMediaQuery from 'shared/hooks/useMediaQuery'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAngleRight } from '@fortawesome/free-solid-svg-icons'

function SideBar({ isOpen, setIsOpen }) {
  const width = useMediaQuery('(max-width: 800px)')
  const [activeSubMenu, setActiveSubMenu] = useState(null)

  const toggleSubMenu = submenu => {
    if (activeSubMenu === submenu) {
      setActiveSubMenu(null)
    } else {
      setActiveSubMenu(submenu)
    }
  }

  const renderTooltip = props => (
    <Tooltip id="sidebar-tooltip" {...props}>
      Sidebar Menu
    </Tooltip>
  )

  return (
    <div className={`side-bar ${width ? !isOpen && 'expanded' : isOpen && 'expanded'}`}>
      <OverlayTrigger placement="right" delay={{ show: 250, hide: 400 }} overlay={renderTooltip}>
        <Button onClick={() => setIsOpen(!isOpen)} variant="link" className="open-btn square lh-1 p-1">
          <FontAwesomeIcon icon={faAngleRight} />
        </Button>
      </OverlayTrigger>
      <div className="menu">
        <ul className="p-0 m-0">
          {sidebarConfig.map((item, index) => {
            return <MenuItem key={index} item={item} isMenuOpen={width ? !isOpen : isOpen} activeSubMenu={activeSubMenu} toggleSubMenu={toggleSubMenu} />
          })}
        </ul>
      </div>
    </div>
  )
}

export default SideBar
