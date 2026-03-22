/* eslint-disable react/prop-types */
import React from 'react'
import PropTypes from 'prop-types'
import { Form } from 'react-bootstrap'
import CommonSpinner from '../CommonSpinner'

function CommonViewInput ({ label, subLabel, required, type, disabled, value, className, isLoading }) {
  return (
    <Form.Group className='form-group w-100'>
      {label && (
        <>
          <Form.Label>
            {label} <span className='subLabel'>{subLabel}</span>
            {label && required && '*'}
          </Form.Label>
        </>
      )}
      {(() => {
        return (
          <div className='common-view-input'>
            <Form.Control as={type === 'text' ? 'input' : 'textarea'} className={className} disabled={disabled} value={value} />
            {isLoading && <CommonSpinner />}
          </div>
        )
      })()}
    </Form.Group>
  )
}
CommonViewInput.propTypes = {
  label: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  value: PropTypes.any,
  type: PropTypes.string,
  className: PropTypes.any
}
export default CommonViewInput
