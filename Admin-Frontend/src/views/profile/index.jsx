/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Form, Button, Spinner, Row, Col } from 'react-bootstrap'
import EditProfileComponent from 'shared/components/Profile'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { profile, UpdateProfile } from 'query/profile/profile.query'
import { useNavigate } from 'react-router-dom'
import { Loader } from 'shared/components/Loader'
import Wrapper from 'shared/components/Wrapper'
import { ReactToastify } from 'shared/utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare, faUser, faXmark } from '@fortawesome/free-solid-svg-icons'
import { getDirtyFormValues } from 'helper/helper'

function EditProfile() {
  const navigate = useNavigate()
  const query = useQueryClient()

  const [profileData, setProfileData] = useState({})
  const [updateFlag, setUpdateFlag] = useState(false)
  const [payload, setPayload] = useState([])
  const [userName, setUserName] = useState('')

  const {
    register,
    control,
    formState: { errors, isDirty, dirtyFields },
    clearErrors,
    trigger,
    getValues,
    reset,
    handleSubmit,
    setValue,
    watch,
    resetField,
  } = useForm({ mode: 'all' })

  //* GET USER PROFILE DATA
  const { isLoading: getLoading, isFetching } = useQuery('getProfile', profile, {
    select: data => data?.data?.data,
    onSuccess: data => {
      setProfileData(data)
      reset({
        sUserName: data?.sUserName,
        sEmail: data?.sEmail,
        // sMobile: data?.sMobile
      })
    },
    onError: () => {
      setProfileData({})
    },
  })

  //* UPDATE USER PROFILE DATA
  const { mutate, isLoading } = useMutation(UpdateProfile, {
    onSuccess: response => {
      ReactToastify(response?.data?.message || 'Profile updated successfully', 'success')
      navigate('/dashboard')
      query.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  function handleChange(e) {
    const { name, value } = e.target
    setUserName(value)
  }

  useEffect(() => {
    const isDirtyData = {
      sUserName: watch('sUserName'),
      sEmail: watch('sEmail'),
      // sMobile: watch('sMobile'),
    }

    const payloadData = getDirtyFormValues(dirtyFields, isDirtyData)
    setPayload(payloadData)
  }, [dirtyFields, watch('sUserName'), watch('sEmail')]) // watch('sMobile')

  const onsubmit = data => {
    mutate({ sUserName: payload?.sUserName })
  }

  function handleCancelButton() {
    setUpdateFlag(!updateFlag)
    reset({
      sUserName: profileData?.sUserName,
      sEmail: profileData?.sEmail,
      // sMobile: profileData?.sMobile,
    })
    // ReactToastify('Changes have been discarded.', 'warning')
  }

  useEffect(() => {
    document.title = 'My Profile | 21 Hold-em'
  }, [])

  return (
    <>
      {getLoading || isFetching ? (
        <Loader />
      ) : (
        <Row className="d-flex justify-content-center">
          <Col xxl={7} xl={9}>
            <Wrapper>
              {!updateFlag ? (
                <button className="Profile-main-edit" onClick={() => setUpdateFlag(!updateFlag)}>
                  <FontAwesomeIcon icon={faPenToSquare} />
                </button>
              ) : (
                <button
                  className="Profile-main-cancel"
                  onClick={() => {
                    handleCancelButton()
                  }}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
              <div className="edit-profile">
                <div className="profile_icon">
                  {profileData?.photoUrl ? <img src={profileData?.photoUrl} alt={profileData?.name} className="img-content" /> : <FontAwesomeIcon icon={faUser} />}
                </div>
                <p>Admin Details</p>
                <hr />
                <Form onSubmit={handleSubmit(onsubmit)} autoComplete="off">
                  <EditProfileComponent
                    register={register}
                    control={control}
                    errors={errors}
                    clearErrors={clearErrors}
                    trigger={trigger}
                    values={getValues()}
                    profileData={profileData}
                    handleChange={e => handleChange(e)}
                    setValue={setValue}
                    updateFlag={updateFlag}
                    setUserName={setUserName}
                  />

                  {updateFlag !== false && (
                    <>
                      <Button variant="primary" type="submit" className="me-2" disabled={!updateFlag || isLoading || !(Object.keys(payload)?.length > 0)}>
                        Update
                        {isLoading && <Spinner animation="border" size="sm" />}
                      </Button>
                      <Button variant="secondary" disabled={isLoading} onClick={() => handleCancelButton()}>
                        Cancel
                      </Button>
                    </>
                  )}
                </Form>
              </div>
            </Wrapper>
          </Col>
        </Row>
      )}
    </>
  )
}

export default EditProfile
