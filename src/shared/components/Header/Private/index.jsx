import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import chip_icon from '../../../../assets/images/gameplay/chip_icon.png'
import btn_plus from '../../../../assets/images/buttons/btn_plus.png'
import logo from '../../../../assets/images/splash/header_logo.png';
import { getCookie, ReactToastify, removeCookie } from 'shared/utils';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { getProfile } from 'query/profile.query';
import _ from 'scripts/helper';
import { Button, Form, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { joinLeaveTable, joinPrivateTable, joinTable } from 'query/gameTable.query';
import { io } from 'socket.io-client';
import { getAvatarImageSrc } from 'shared/constants/builtInAvatars';
const HeaderPrivate = () => {
    const [playerData, setPlayerData] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(true);
    const [modalShow, setModalShow] = useState(false);
    const navigate = useNavigate()
    const queryClient = useQueryClient();
    const currentPath = useLocation().pathname;

    // Get profile data
    const { data: profileData, isLoading: isProfileDataLoading } = useQuery("profileData", getProfile, {
        select: (data) => data?.data?.data,
        onSuccess: (data) => {
            setPlayerData(data);
            setModalShow(false);
            if (data?.aPokerBoard?.length > 0) {
                setModalShow(true);
            }
        },
        onError: (error) => {
            if (error?.response?.status === 419) {
                ReactToastify(error?.response?.data?.message, 'error', 'profileData');
            }
            removeCookie('sAuthToken');
            navigate('/login');
        },
    });

    // Leave Table
    const { mutate: mutateLeaveTable } = useMutation("joinLeaveTable", joinLeaveTable, {
        onSuccess: (response) => {
            if (response?.status === 200) {
                setModalShow(false);
                queryClient.invalidateQueries("profileData");
                queryClient.invalidateQueries("getTables");
                ReactToastify(response?.data?.message, 'success');
            }
            else {
                ReactToastify(response?.data?.message, 'error');
            }
        },
        onError: (error) => {
            setModalShow(false);
            queryClient.invalidateQueries("profileData");
            ReactToastify(error?.response?.data?.message, 'error');
        }
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showUserMenu && !event.target.closest('.header-private__menu-user') && !event.target.closest('.header-private__menu-user-dropdown')) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showUserMenu]);

    const handleLogout = () => {
        removeCookie('sAuthToken')
        navigate('/login');
    }

    const handleLeaveTable = () => {
        mutateLeaveTable();
    }

    const handleJoinTable = () => {
        const state = { sAuthToken: getCookie('sAuthToken'), iBoardId: playerData?.aPokerBoard[0] };
        if (playerData?.sPrivateCode) {
            navigate(`/game`, {
                state: {
                    ...state,
                    sPrivateCode: playerData?.sPrivateCode
                }
            });
            return;
        }
        navigate(`/game`, { state });
    }

    return (
        <>
            <nav className='header-private navbar navbar-expand-xl'>
                <div className='header-private__logo'>
                    <Link to='/lobby'>
                        <img src={logo} alt="logo" />
                    </Link>
                </div>
                <button className="navbar-toggler" type="button" onClick={() => setIsNavbarCollapsed(!isNavbarCollapsed)}>
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className={`collapse navbar-collapse ${isNavbarCollapsed ? 'collapse' : 'show'}`}>
                    <div className='header-private__menu'>
                        <ul className="navbar-nav">
                            <li className="nav-item">
                                <Link className={`nav-link ${currentPath === '/lobby' ? 'active' : ''}`} to='/lobby'>LOBBY</Link>
                            </li>
                            <li className="nav-item">
                                <Link className={`nav-link ${currentPath === '/how-to-play' ? 'active' : ''}`} to={'/how-to-play'}>HOW TO PLAY</Link>
                            </li>
                        </ul>
                        <div className="header-private__menu-wallet">
                            <span className="header-private__menu-wallet-iconChip"><img src={chip_icon} alt='chips' /></span>
                            <span>{_.formatCurrency(playerData?.nChips)}</span>
                            <span className="header-private__menu-wallet-iconPlus" onClick={() => navigate('/shop')}><img src={btn_plus} alt='plus' /></span>
                            {/* <div className="full-wallet-amount">{playerData?.nChips.toFixed(2)}</div> */}
                        </div>
                        <div className='header-private__menu-user' onClick={() => setShowUserMenu(!showUserMenu)}>
                            <div className='header-private__menu-user-avatar'>
                                <img
                                    src={getAvatarImageSrc(playerData?.sAvatar, playerData?.sUserName)}
                                    alt='avatar'
                                    onError={(event) => {
                                        event.currentTarget.src = getAvatarImageSrc('', playerData?.sUserName);
                                    }}
                                />
                            </div>
                            <div className='header-private__menu-user-name'>
                                <span>{_.appendSuffix(playerData?.sUserName)}</span>
                            </div>
                            <div className='header-private__menu-user-downArrow'>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 10L12 15L17 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            {showUserMenu && (
                                <div className="header-private__menu-user-dropdown">
                                    <ul>
                                        <li><Link className='link' to='/profile' onClick={() => setShowUserMenu(false)}>My Profile</Link></li>
                                        <li><Link className='link' to='/transactions' onClick={() => setShowUserMenu(false)}>My Transactions</Link></li>
                                        <li><div className='link' onClick={() => handleLogout()}>Log Out</div></li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
            <Modal
                className={"join-table-modal"}
                show={modalShow}
                size="md"
                centered
            >
                <Modal.Body>
                    <Form>
                        {/* <div className="title">JOIN TABLE</div> */}
                        <div className="content">
                            <p>
                                Are you sure you want to rejoin the table?
                            </p>
                        </div>
                        <div className="button-grp">
                            <Button className='cancel' type='button' onClick={handleLeaveTable} >Leave Table</Button>
                            <Button className='join' type='button' onClick={handleJoinTable}>Join Table</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    )
}

export default HeaderPrivate
