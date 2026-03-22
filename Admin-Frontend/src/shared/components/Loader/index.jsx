import React from 'react'
import { Spinner } from 'react-bootstrap'

export function Loader() {
  return (
    <div className='loading d-flex align-items-center justify-content-center top-0 left-0 position-fixed h-100 w-100'>
      <Spinner animation='border' />
    </div>
  )
}
