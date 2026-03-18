import React from 'react'
import PropTypes from 'prop-types'
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap'
import { validationErrors } from '../../constants/ValidationConditions'
import Loader from '../Loader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo, faIndianRupee, faPen } from '@fortawesome/free-solid-svg-icons'

function CommonInput({
  type,
  errors,
  className,
  onChange,
  label,
  name,
  register,
  disabled,
  value,
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
  updateFlag,
  min,
  max,
  minLength,
  maxLength,
  onPaste,
  price,
  hasTooltip,
  tooltipMsg
}) {
  const splitName = name.split('.')

  function applyValidation() {
    if (required) {
      return {
        required: 'Required',
        maxLength: { value: 10000, message: 'characters not allowed more than 10000' },
        minLength: { value: 1, message: 'characters not allowed less than 1' },
        onChange: (e) => { },
        ...validation
      }
    } else {
      return {
        maxLength: { value: 10000, message: 'characters not allowed more than 10000' },
        ...validation
      }
    }
  }

  const setRegister = register(name, applyValidation())
  const renderTooltip = (text) => <Tooltip id='tab-tooltip'>{text}</Tooltip>

  return (
    <Form.Group className='form-group w-100'>
      {label && (
        <Form.Label>
          <span>
            {label && <div>{label}</div>}
            {/* {label && required && <span className='inputStar'>*</span>} */}
          </span>
          {hasTooltip &&
            <span className='tooltip-icon'>
              <OverlayTrigger
                placement='top'
                overlay={renderTooltip(tooltipMsg)}
                // show={gameModeToggle.head === true}
                delay={{ show: 250, hide: 250 }}
              >
                <FontAwesomeIcon icon={faCircleInfo} />
              </OverlayTrigger>
            </span>
          }
        </Form.Label>
      )}

      {(() => {
        if (viewOnly) {
          return <Form.Control as={type === 'text' ? 'input' : 'textarea'} className={className} disabled={disabled} value={veiwValue} />
        } else {
          return (
            <div className='common-view-input profile-input'>
              <Form.Control
                as={type === 'text' ? 'input' : 'textarea'}
                name={name}
                className={className}
                defaultValue={defaultValue}
                disabled={disabled}
                style={style}
                value={value}
                placeholder={placeholder}
                min={min}
                minLength={minLength}
                max={max}
                maxLength={maxLength}
                onPaste={
                  onPaste &&
                  ((e) => {
                    e.preventDefault()
                    return false
                  })
                }
                {...setRegister}
                onChange={(e) => {
                  setRegister.onChange(e)
                  onChange && onChange(e)
                }}
                onBlur={(e) => {
                  e.target.value = e?.target?.value?.trim()
                  onBlur && onBlur(e)
                  setRegister.onChange(e)
                }}
              />
              {price && <FontAwesomeIcon icon={faIndianRupee} />}
              {updateFlag && <FontAwesomeIcon icon={faPen} />}
              {isLoading && <Loader />}
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
        ? errors && customerror && <Form.Control.Feedback type='invalid'>errorsmessage</Form.Control.Feedback>
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
