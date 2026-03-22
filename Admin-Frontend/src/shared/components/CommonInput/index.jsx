/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Form } from 'react-bootstrap'
import { validationErrors } from 'shared/constants/ValidationErrors'
import CommonSpinner from '../CommonSpinner'

function CommonInput ({
  type,
  errors,
  className,
  onChange,
  label,
  name,
  register,
  disabled,
  required,
  onBlur,
  placeholder,
  defaultValue,
  validation,
  style,
  children,
  viewOnly,
  veiwValue,
  isLoading,
  customerror,
  onPaste,
  maxLength,
  minLength,
  max,
  min,
  subLabel
}) {
  const splitName = name.split('.')

  function applyValidation () {
    if (required) {
      return {
        required: validationErrors.required,
        maxLength: { value: 10000, message: validationErrors.maxLength(10000) },
        minLength: { value: 1, message: validationErrors.minLength(1) },
        onChange: (e) => { },
        ...validation
      }
    } else {
      return {
        maxLength: { value: 10000, message: validationErrors.maxLength(10000) },
        ...validation
      }
    }
  }

  const setRegister = register(name, applyValidation())
  // const [wordCount, setWordCount] = useState()
  return (
    <Form.Group className='form-group w-100'>
      {label && (
        <Form.Label>
          {label} <span>{subLabel}</span>
          {label && required && <span className='inputStar'>*</span>}
        </Form.Label>
      )}
      {(() => {
        if (viewOnly) {
          return <Form.Control as={type === 'text' ? 'input' : 'textarea'} className={className} disabled={disabled} value={veiwValue} />
        } else {
          return (
            <div className='common-view-input'>
              <Form.Control
                as={type === 'text' ? 'input' : 'textarea'}
                name={name}
                className={className}
                defaultValue={defaultValue}
                disabled={disabled}
                style={style}
                placeholder={placeholder}
                minLength={minLength}
                maxLength={maxLength}
                min={min}
                max={max}
                onPaste={
                  onPaste &&
                  ((e) => {
                    e.preventDefault()
                    return false
                  })
                }
                {...setRegister}
                onChange={(e) => {
                  // setWordCount(e.target.value.length)
                  setRegister.onChange(e)
                  onChange && onChange(e)
                }}
                onBlur={(e) => {
                  e.target.value = e?.target?.value?.trim()
                  onBlur && onBlur(e)
                  setRegister.onChange(e)
                }}
              />
              {isLoading && <CommonSpinner />}
              {/* {type === 'textarea' && <p style={{ color: 'var(--secondary-300)', fontWeight: '500', fontSize: '13px', textAlign: 'right', marginBottom: '0' }}>{wordCount || 0}/150</p>} */}
            </div>
          )
        }
      })()}
      {splitName.length > 1 && errors && errors[splitName[0]] && errors[splitName[0]][splitName[1]] && (
        <Form.Control.Feedback type='invalid'>{errors[splitName[0]][splitName[1]].message}</Form.Control.Feedback>
      )}
      {splitName.length > 2 &&
        errors &&
        errors[splitName[0]] &&
        errors[splitName[0]][splitName[1]] &&
        errors[splitName[0]][splitName[1]][splitName[2]] && (
          <Form.Control.Feedback type='invalid'>{errors[splitName[0]][splitName[1]][splitName[2]].message}</Form.Control.Feedback>
        )}
      {errors && customerror
        ? errors && customerror && <Form.Control.Feedback type='invalid'>{customerror.message}</Form.Control.Feedback>
        : errors && errors[name] && <Form.Control.Feedback type='invalid'>{errors[name].message}</Form.Control.Feedback>}
      {children}
    </Form.Group>
  )
}
CommonInput.propTypes = {
  type: PropTypes.string,
  viewOnly: PropTypes.bool,
  name: PropTypes.string,
  veiwValue: PropTypes.any,
  placeholder: PropTypes.string,
  categoryURL: PropTypes.string,
  label: PropTypes.string,
  defaultValue: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  maxWord: PropTypes.number,
  register: PropTypes.func,
  children: PropTypes.node,
  onBlur: PropTypes.any,
  onChange: PropTypes.any,
  control: PropTypes.object,
  style: PropTypes.object,
  errors: PropTypes.object,
  className: PropTypes.any,
  availableSlug: PropTypes.string,
  altTextLabel: PropTypes.string,
  validation: PropTypes.object
}
export default CommonInput
