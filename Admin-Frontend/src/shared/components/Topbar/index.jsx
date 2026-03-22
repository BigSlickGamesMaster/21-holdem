import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Button } from 'react-bootstrap'
import Search from '../Search'

function TopBar ({ buttons, btnEvent, searchEvent }) {
  const ref = useRef(null)
  const [height, setHeight] = useState('')

  useEffect(() => {
    window.innerWidth > 767 && setHeight(-ref.current.clientHeight)
  }, [])

  return (
    <>
      <div className='top-bar d-flex justify-content-end' ref={ref} style={{ marginBottom: height }}>
        {searchEvent && <Search size='md' className='m-0' searchEvent={searchEvent} />}
        <div className='buttons'>
          {buttons.map((btn, index) => {
            return (
              <Button key={index} variant={btn.type} className={btn.icon && ' left-icon'} onClick={() => btnEvent(btn.clickEventName)}>
                {btn.icon === 'edit' ? <i className='icon-create' /> : <i className={btn.icon}></i>}
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
