import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import chip_icon from '../../../../assets/images/gameplay/chip_icon.png'
import btn_plus from '../../../../assets/images/buttons/btn_plus.png'
import { getCookie, ReactToastify, removeCookie } from 'shared/utils';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { getProfile } from 'query/profile.query';
import _ from 'scripts/helper';
import { Button, Form, Modal } from 'react-bootstrap';
import { joinLeaveTable } from 'query/gameTable.query';
import { getAvatarImageSrc } from 'shared/constants/builtInAvatars';
const HeaderPrivate = () => {
    const [playerData, setPlayerData] = useState(null);
    const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(true);
    const [modalShow, setModalShow] = useState(false);
    const headerRef = useRef(null);
    const navigate = useNavigate()
    const queryClient = useQueryClient();
    const currentPath = useLocation().pathname;

    // Get profile data
    useQuery("profileData", getProfile, {
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
                queryClient.invalidateQueries("layout-profile");
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
            queryClient.invalidateQueries("layout-profile");
            ReactToastify(error?.response?.data?.message, 'error');
        }
    });

    useEffect(() => {
        const handleProfileRefresh = () => {
            queryClient.invalidateQueries("profileData");
            queryClient.invalidateQueries("layout-profile");
        };

        window.addEventListener('bsg:profile-refresh', handleProfileRefresh);
        return () => window.removeEventListener('bsg:profile-refresh', handleProfileRefresh);
    }, [queryClient]);

    useEffect(() => {
        setIsNavbarCollapsed(true);
    }, [currentPath]);

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (!isNavbarCollapsed && headerRef.current && !headerRef.current.contains(event.target)) {
                setIsNavbarCollapsed(true);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [isNavbarCollapsed]);

    const handleLeaveTable = () => {
        mutateLeaveTable();
    }

    const closeHeaderMenus = () => {
        setIsNavbarCollapsed(true);
    };

    const handleOpenProfileSettings = () => {
        closeHeaderMenus();
        navigate('/profile');
    };

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
            <nav ref={headerRef} className='header-private navbar navbar-expand-xl'>
                <button className="navbar-toggler" type="button" onClick={() => setIsNavbarCollapsed(!isNavbarCollapsed)}>
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className={`collapse navbar-collapse ${isNavbarCollapsed ? 'collapse' : 'show'}`}>
                    <div className='header-private__menu'>
                        <ul className="navbar-nav">
                            <li className="nav-item">
                                <Link className={`nav-link ${currentPath === '/lobby' ? 'active' : ''}`} to='/lobby' onClick={closeHeaderMenus}>LOBBY</Link>
                            </li>
                            <li className="nav-item">
                                <Link className={`nav-link ${currentPath === '/profile' ? 'active' : ''}`} to='/profile' onClick={closeHeaderMenus}>PROFILE / SETTINGS</Link>
                            </li>
                        </ul>
                        <div className="header-private__menu-wallet">
                            <span className="header-private__menu-wallet-iconChip"><img src={chip_icon} alt='chips' /></span>
                            <span>{_.formatCurrency(playerData?.nChips)}</span>
                            <span className="header-private__menu-wallet-iconPlus" onClick={() => { closeHeaderMenus(); navigate('/lobby?tab=lobby-shop'); }}><img src={btn_plus} alt='plus' /></span>
                            {/* <div className="full-wallet-amount">{playerData?.nChips.toFixed(2)}</div> */}
                        </div>
                        <div className='header-private__menu-user' onClick={handleOpenProfileSettings}>
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
