import React, { Suspense, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
// import Breadcrumbs from '../../shared/components/'
import useMediaQuery from '../../shared/hooks/useMediaQuery'
import { Spinner } from 'react-bootstrap'
import HeaderPrivate from 'shared/components/Header/Private'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getCookie } from 'shared/utils'
import { useQuery, useQueryClient } from 'react-query'
import { getProfile } from 'query/profile.query'
import { getAvatarImageSrc } from 'shared/constants/builtInAvatars'
import newBannerImg from '../../assets/images/bg/new-banner.png'
import _ from 'scripts/helper'

function MainLayout({ children }) {
    const [isOpen] = useState(true)
    const location = useLocation()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const width = useMediaQuery('(max-width: 300px)')

    const getPath = useLocation().pathname
    const isGamePlay = getPath === '/game'

    useEffect(() => {
        if (getPath === '/game') return

        window.FXOverlay?.clear?.()
        window.FXOverlay?.clearAnchor?.('pot')
        window.FXOverlay?.clearAnchor?.('table')
        window.FXOverlay?.clearAnchor?.('potPile')
        window.FXOverlay?.clearAnchor?.('betSource')
        window.FXOverlay?.clearAnchor?.('activePlayer')
        window.FXOverlay?.clearAnchor?.('mySeat')
        window.FXOverlay?.clearFocus?.()
        window.FXOverlay?.setPotAmount?.(0)
        window.FXOverlay?.disable?.()

        document.querySelectorAll('.login-background-only__chip-field, .login-background-only__chip').forEach((node) => node.remove())
    }, [getPath])

    const isLobby = getPath === '/lobby'
    const sActiveLobbyTab = isLobby ? new URLSearchParams(location.search).get('tab') || 'lobby-live-tables' : ''
    const sBackgroundScene = isLobby
        ? sActiveLobbyTab.replace(/^lobby-/, '').replace(/[^a-z0-9]+/g, '-')
        : getPath.replace(/^\//, '').replace(/[^a-z0-9]+/g, '-') || 'home'

    const { data: profileResp } = useQuery('layout-profile', getProfile, { enabled: !!getCookie('sAuthToken'), staleTime: 60000 })
    const profileData = profileResp?.data?.data
    const sAvatarSrc = getAvatarImageSrc(profileData?.sAvatar, profileData?.sUserName)
    const sDisplayName = profileData?.sUserName || ''

    useEffect(() => {
        const handleProfileRefresh = () => {
            queryClient.invalidateQueries('layout-profile')
            queryClient.invalidateQueries('profileData')
        }

        window.addEventListener('bsg:profile-refresh', handleProfileRefresh)
        return () => window.removeEventListener('bsg:profile-refresh', handleProfileRefresh)
    }, [queryClient])

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
        <div
            id={isGamePlay ? 'main-layout' : undefined}
            className={`main-layout main-layout--scene-${sBackgroundScene} ${isGamePlay ? 'gameplay-layout' : ''}`}
        >
            <div className='main-layout-background'></div>
            {!isGamePlay && !isLobby && <HeaderPrivate />}
            {!isGamePlay && <div className='lobby-topbar'>
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
                </div>}
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
