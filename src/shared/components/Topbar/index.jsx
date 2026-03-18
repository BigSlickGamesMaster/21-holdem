import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'react-bootstrap'
import Search from '../Search'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

function TopBar({ buttons, searchEvent }) {
  const ref = useRef(null)
  const [height, setHeight] = useState('')

  useEffect(() => {
    window.innerWidth > 767 && setHeight(-ref.current.clientHeight)
  }, [])

  return (
    <>
      <div className='top-bar' ref={ref}>
        {searchEvent && <Search size='md' className='m-0' searchEvent={searchEvent} />}
        <div className='buttons'>
          {buttons.map((btn, index) => {
            return (
              <Button key={index} className={btn.icon && 'topbar-button'} onClick={() => btn?.btnEvent(btn.clickEventName)}>
                <FontAwesomeIcon icon={btn.icon} />
                {btn.text}
              </Button>
            )
          })}
        </div>
      </div>
    </>
  )
}
TopBar.propTypes = {
  buttons: PropTypes.array,
  btnEvent: PropTypes.func,
  searchEvent: PropTypes.func
}
export default TopBar