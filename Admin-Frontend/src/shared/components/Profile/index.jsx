/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React from 'react'
import { Form, Row, Col } from 'react-bootstrap'
import PropTypes from 'prop-types'
import { validationErrors } from 'shared/constants/ValidationErrors'
import { EMAIL } from 'shared/constants'
import CommonInput from '../CommonInput'

function EditProfileComponent({ register, errors, profileData, handleChange, updateFlag, setUserName }) {
  return (
    <Row>
      <Col md={6}>
        <CommonInput
          type="text"
          register={register}
          errors={errors}
          name="sUserName"
          label="User Name"
          placeholder="Enter Username"
          className={`form-control ${errors?.sUserName && 'error'}`}
          // isLoading={isLoading}
          disabled={!updateFlag}
          maxLength={10}
          validation={{
            required: {
              value: true,
              message: 'User name is required',
            },
            maxLength: {
              value: 10,
              message: validationErrors.rangeLength(2, 10),
            },
            minLength: {
              value: 2,
              message: validationErrors.rangeLength(2, 10),
            },
            // pattern: {
            //   value: /^[a-zA-Z ]+$/,
            //   message: 'Special characters and numbers are not allowed',
            // },
          }}
        />
      </Col>
      <Col md={6}>
        <Form.Group className="form-group">
          <Form.Label>User Type</Form.Label>
          <Form.Control type="text" name="eUserType" value={profileData.eUserType} disabled />
        </Form.Group>
      </Col>
      <Col md={6}>
        <CommonInput
          type="text"
          register={register}
          errors={errors}
          className={`form-control ${errors?.sEmail && 'error'}`}
          name="sEmail"
          label="Email"
          disabled
          updateFlag={updateFlag}
          placeholder="Enter your email address"
          validation={{
            pattern: {
              value: EMAIL,
              message: 'Provide a valid email format.',
            },
            required: {
              value: true,
              message: 'Email address is required',
            },
            maxLength: {
              value: 45,
              message: 'Email address must be less than 45 char long.',
            },
          }}
        />
      </Col>
      {/* <Col md={6}>
        <Form.Group className='form-group'>
          <Form.Label>Mobile Number</Form.Label>
          <Form.Control type='text' name='sMobile' value={profileData.sMobile} disabled />
        </Form.Group>
      </Col> */}
    </Row>
  )
}

EditProfileComponent.propTypes = {
  register: PropTypes.func,
  values: PropTypes.object,
  control: PropTypes.object,
  errors: PropTypes.object,
  clearErrors: PropTypes.func,
  trigger: PropTypes.func,
  sProfilePicture: PropTypes.string,
  profileData: PropTypes.object,
  sBankDetailPic: PropTypes.string,
  sPanPicture: PropTypes.string,
  handleChange: PropTypes.func,
  setValue: PropTypes.func,
}

export default EditProfileComponent
