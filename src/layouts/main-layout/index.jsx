import React, { Suspense, useContext, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
// import Breadcrumbs from '../../shared/components/'
import useMediaQuery from '../../shared/hooks/useMediaQuery'
import { Spinner } from 'react-bootstrap'
import HeaderPrivate from 'shared/components/Header/Private'
import { GamePlayContext } from 'context/gamePlayContext'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getCookie, ReactToastify } from 'shared/utils'
import { useQuery } from 'react-query'
import { io } from 'socket.io-client'
import { getProfile } from 'query/profile.query'
import { getAvatarImageSrc } from 'shared/constants/builtInAvatars'
import newBannerImg from '../../assets/images/bg/new-banner.png'
import _ from 'scripts/helper'

function MainLayout({ children }) {
    const [isOpen, setIsOpen] = useState(true)
    const location = useLocation()
    const navigate = useNavigate()
    const width = useMediaQuery('(max-width: 300px)')

    const [isGamePlay, setIsGamePlay] = useState(false)
    const getPath = useLocation().pathname

    useEffect(() => {
        getPath === '/game' ? setIsGamePlay(true) : setIsGamePlay(false)
    }, [getPath])

    const isLobby = getPath === '/lobby'

    const { data: profileResp } = useQuery('layout-profile', getProfile, { enabled: !!getCookie('sAuthToken'), staleTime: 60000 })
    const profileData = profileResp?.data?.data
    const sAvatarSrc = getAvatarImageSrc(profileData?.sAvatar, profileData?.sUserName)
    const sDisplayName = profileData?.sUserName || ''

    // const socket = new io('http://192.168.11.56:3050', {
    //     transports: ["websocket", "polling"],
    //     query: {
    //         authorization: getCookie('sAuthToken'),
    //     },
    // })

    // useEffect(() => {
    //     console.log('socket', socket, socket.connected)
    //     if (getCookie('sAuthToken')) {
    //         if (!socket?.connected && socket !== undefined) {
    //             socket.on("connect", () => {
    //                 console.log("Connected to Socket :: ", socket.id);
    //             });
    //             socket.on("disconnect", () => {
    //                 console.log("Disconnected from Socket");
    //             });
    //             socket.on("reconnect", () => {
    //                 console.log("Reconnected to Socket");
    //             });
    //             socket.on("connect_error", (error) => {
    //                 console.error("Error while connecting to the server:", error);
    //             });
    //         }
    //         else {
    //             console.warn('Socket Connected Successfuly.')
    //         }
    //     }
    // }, [socket, getCookie('sAuthToken')])

    return (
        <div id={isGamePlay ? 'main-layout' : undefined} className={`main-layout ${isGamePlay ? 'gameplay-layout' : ''}`}>
            <div className='main-layout-background'></div>
            {!isGamePlay && !isLobby && <HeaderPrivate />}
            <div className='lobby-topbar'>
                    <Link to='/lobby' className='lobby-topbar__logo' aria-label="21 Hold'em home">
                        <img src={newBannerImg} alt="21 Hold'em" className='lobby-topbar__logo-img' />
                    </Link>
                    <button type='button' className='lobby-topbar__bankroll' onClick={() => navigate('/lobby?tab=lobby-player-profile')}>
                        <span className='lobby-topbar__bankroll-avatar'>
                            <img
                                src={sAvatarSrc}
                                alt={profileData?.sUserName || 'Player'}
                                onError={(e) => { e.currentTarget.src = getAvatarImageSrc('', profileData?.sUserName) }}
                            />
                        </span>
                        <span className='lobby-topbar__bankroll-copy'>
                            <span className='lobby-topbar__bankroll-name'>{_.appendSuffix(sDisplayName, 14)}</span>
                            <span className='lobby-topbar__bankroll-amount'>{_.formatCurrencyWithComa(Number(profileData?.nChips) || 0)}</span>
                        </span>
                    </button>
                </div>
            <div className={`main-container ${width ? !isOpen && 'active' : isOpen && 'active'}`}>
                <div className='container-fluid'>
                    {/* <Breadcrumbs /> */}
                    <Suspense fallback={
                        <div className='d-flex align-items-center justify-content-center top-0 left-0 position-fixed h-100 w-100'>
                            <Spinner animation='border' size='sm' variant='success' />
                        </div>
                    }>
                        {children}
                    </Suspense>
                </div>
            </div>
        </div>
    )
}
MainLayout.propTypes = {
    children: PropTypes.node.isRequired
}
export default MainLayout
