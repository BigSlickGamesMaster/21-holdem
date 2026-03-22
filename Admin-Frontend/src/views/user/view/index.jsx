/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react'
import { faBuildingColumns, faCertificate, faCheck, faEnvelope, faFileInvoice, faPhone, faRobot, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { getUserById } from 'query/user/user.query'
import { Col, Row, Spinner } from 'react-bootstrap'
import { useForm } from 'react-hook-form'
import { useQuery } from 'react-query'
import { useLocation, useParams } from 'react-router-dom'
import UserDetails from 'shared/components/UserDetails'
import UserKYCDetail from 'shared/components/UserKYCDetail'
import Wrapper from 'shared/components/Wrapper'
import BankInfo from 'shared/components/BankInfo'

const ViewUser = () => {
  const { id } = useParams()
  const location = useLocation()

  const {
    control,
    reset,
    formState: { errors },
    register,
    getValues,
    setValue,
  } = useForm()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const ICONS = {
    VERIFIED: <FontAwesomeIcon icon={faCertificate} className="verified" />,
    NOT_VERIFIED: <FontAwesomeIcon icon={faCertificate} className="not-verified" />,
    TICK: <FontAwesomeIcon icon={faCheck} className="tick" />,
    USER: <FontAwesomeIcon icon={faUser} />,
    BOT: <FontAwesomeIcon icon={faRobot} />,
    CERTIFICATE_BADGE: <FontAwesomeIcon icon={faCertificate} />,
    EMAIL: <FontAwesomeIcon icon={faEnvelope} />,
    PHONE: <FontAwesomeIcon icon={faPhone} />,
  }

  const TAB_ICONS = {
    PROFILE: <FontAwesomeIcon icon={faUser} color="#338ef7" />,
    BANK: <FontAwesomeIcon icon={faBuildingColumns} color="#ffc107" />,
    KYC: <FontAwesomeIcon icon={faFileInvoice} />,
  }

  const tab_buttons = [
    { label: 'Profile', icon: TAB_ICONS.PROFILE, toggle: 'userDetail' },
    // { label: 'Bank', icon: TAB_ICONS.BANK, toggle: 'bankInfo' },
    // { label: 'KYC Details', icon: TAB_ICONS.KYC, toggle: 'KYCDetail' },
  ]

  const [buttonToggle, setButtonToggle] = useState({
    userDetail: true,
    bankInfo: false,
    KYCDetail: false,
  })

  // GET SPECIFIC USER
  const { data: userDetail, isLoading: userLoading } = useQuery('userDataById', () => getUserById(id), {
    enabled: !!id,
    select: data => data?.data?.data,
    onSuccess: () => {
      reset({})
    },
  })

  useEffect(() => {
    location?.state === 'view-kyc' && setButtonToggle({ KYCDetail: true })
  }, [location?.state])

  useEffect(() => {
    document.title = userDetail?.eUserType === 'ubot' && id ? 'View Bot | User Management | 21 Hold-em' : 'View User | User Management | 21 Hold-em'
  }, [id, userDetail])

  return (
    <>
      <div className="user-basic-upper">
        <Wrapper>
          <Row className="p-0 m-0">
            <Col xxl="4" lg="4" md="12" sm="12" className="p-0 m-0">
              <div className="left-side-user-data">
                <div className="profile_icon">
                  {userLoading ? (
                    <Spinner animation="border" variant="primary" />
                  ) : (
                    <>
                      {userDetail?.sAvatar ? <img src={userDetail?.sAvatar} alt={`${userDetail?.sUserName} profile`} /> : ICONS.USER}
                      {userDetail?.isEmailVerified === true && userDetail?.eStatus === 'y' ? (
                        <>
                          {' '}
                          {ICONS.VERIFIED}
                          {ICONS.TICK}{' '}
                        </>
                      ) : (
                        <>
                          {' '}
                          {ICONS.NOT_VERIFIED}
                          {ICONS.TICK}{' '}
                        </>
                      )}
                    </>
                  )}
                </div>
                <div className="user-data-name">{location?.state === 'no-user' ? '-' : userDetail?.sUserName}</div>
                <div className="user-data-type">
                  {userDetail?.eUserType}
                  {userDetail?.eUserType === 'ubot' && <span className="bot-icon">{ICONS.BOT}</span>}
                </div>
              </div>
            </Col>
            <Col xxl="8" lg="8" md="12" sm="12" className="p-0 m-0">
              <div className="right-side-user-data">
                <div className="user-basic-data">
                  <div className="user-data-email">
                    {userDetail?.eUserType === 'user' && (
                      <span>
                        {ICONS.EMAIL}
                        {location?.state === 'no-user'
                          ? '-'
                          : (userDetail?.isEmailVerified ? (
                              <>
                                {userDetail.sEmail}
                                <span className="verified">{ICONS.CERTIFICATE_BADGE}</span>
                              </>
                            ) : (
                              <>
                                {userDetail.sEmail}
                                <span className="not-verified">{ICONS.CERTIFICATE_BADGE}</span>
                              </>
                            )) || 'Not Provided'}
                      </span>
                    )}
                  </div>
                  {/* <div className="user-data-mobile">
                    {userDetail?.eUserType === 'user' && (
                      <span>
                        {ICONS.PHONE}
                        {location?.state === 'no-user'
                          ? '-'
                          : (userDetail?.isMobileVerified ? (
                              <>
                                {userDetail?.sMobile}
                                <span className="verified">{ICONS.CERTIFICATE_BADGE}</span>
                              </>
                            ) : (
                              <>
                                {userDetail?.sMobile}
                                <span className="not-verified">{ICONS.CERTIFICATE_BADGE}</span>
                              </>
                            )) || 'Not Provided'}
                      </span>
                    )}
                  </div> */}
                </div>
                {/* <div className='user-details-button-group mt-md-2 mt-sm-2'>
                                    {tab_buttons?.map((button, index) => (
                                        <button key={index} className={buttonToggle[button.toggle] && 'userActive'} onClick={() => setButtonToggle({ [button.toggle]: true })}>
                                            {button.icon} {button.label}
                                        </button>
                                    ))}
                                </div> */}
              </div>
            </Col>
          </Row>
        </Wrapper>
      </div>

      <div className="user-basic-lower">
        <UserDetails
          id={id}
          userData={location?.state === 'no-user' ? '-' : userDetail}
          control={control}
          errors={errors}
          register={register}
          getValues={getValues}
          setValue={setValue}
          reset={reset}
        />
        {/* {buttonToggle?.userDetail && <UserDetails id={id} userData={location?.state === 'no-user' ? '-' : userDetail} control={control} errors={errors} register={register} getValues={getValues} setValue={setValue} reset={reset} />} */}
        {/* {buttonToggle?.bankInfo && <BankInfo id={id} bank={userDetail} />}
                {buttonToggle?.KYCDetail && <UserKYCDetail id={id} userKYC={userDetail} />} */}
      </div>
    </>
  )
}

export default ViewUser
