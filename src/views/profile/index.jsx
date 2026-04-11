import { getDirtyFormValues } from "helper/helper";
import { getProfile, updateProfile } from "query/profile.query";
import React, { useEffect, useState } from "react";
import { Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faBagShopping, faGear, faGift, faShieldHalved, faTableCellsLarge, faUser } from "@fortawesome/free-solid-svg-icons";
import _ from "scripts/helper";
import { ReactToastify, removeCookie } from "shared/utils";
import { buildAvatarOptions, getAvatarImageSrc } from "shared/constants/builtInAvatars";


const QUICK_NAV_ITEMS = [
    { id: 'lobby-live-tables', label: 'Live Tables', icon: faTableCellsLarge, kind: 'tab', path: '/lobby?tab=lobby-live-tables' },
    { id: 'lobby-missions', label: 'Missions & Rewards', icon: faGift, kind: 'tab', path: '/lobby?tab=lobby-missions' },
    { id: 'lobby-private-table', label: 'Private Table', icon: faShieldHalved, kind: 'tab', path: '/lobby?tab=lobby-private-table' },
    { id: 'lobby-player-profile', label: 'Player Profile', icon: faUser, kind: 'tab', path: '/lobby?tab=lobby-player-profile' },
    { id: 'lobby-shop', label: 'Shop', icon: faBagShopping, kind: 'tab', path: '/lobby?tab=lobby-shop' },
    { id: 'lobby-settings', label: 'Settings', icon: faGear, kind: 'route', path: '/profile' },
];

const Profile = () => {
    const [payload, setPayload] = useState({});
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const [avatarList, setAvatarList] = useState();
    const { reset, watch, formState: { isDirty, dirtyFields }, handleSubmit, setValue } = useForm({ mode: "all" });

    const { data: profileData, isLoading: isProfileDataLoading } = useQuery("getProfile", getProfile, {
        select: (data) => data?.data?.data,
        onSuccess: (response) => {
            const selectedAvatar = getAvatarImageSrc(response?.sAvatar, response?.sUserName);
            reset({
                sAvatar: selectedAvatar,
            })
            handleAvatarList(response?.aAvatar?.aAvatar, selectedAvatar)
        },
    });

    const handleAvatarList = (aAvatarList, sAvatar) => {
        setAvatarList(buildAvatarOptions(aAvatarList, sAvatar))
    }

    const handleAvatarSelect = (avatar) => {
        const selectedAvatar = avatarList.find(item => item.sPath === avatar.sPath);
        if (selectedAvatar) {
            // setValue('sAvatar', selectedAvatar.sPath);
            setValue('sAvatar', selectedAvatar.sPath, { shouldDirty: true });
            setAvatarList(prevList => prevList.map(item => ({
                ...item,
                selected: item.sPath === avatar.sPath
            })));
        }
    }

    const { mutate: mutateProfileUpdate } = useMutation("updateProfile", updateProfile, {
        onSuccess: (response) => {
            if (response?.status === 200) {
                ReactToastify(response?.data?.message, 'success');
            }
            else {
                ReactToastify(response?.data?.message, 'error');
            }
            queryClient.invalidateQueries('getProfile')
            queryClient.invalidateQueries('profileData')
        },
        onError: (error) => {
            ReactToastify(error?.response?.data?.message, 'error');
        }
    });

    const watchedAvatar = watch("sAvatar");

    useEffect(() => {
        const isDirtyField = {
            sAvatar: watchedAvatar || "-",
        };

        const payloadData = getDirtyFormValues(dirtyFields, isDirtyField);
        setPayload(payloadData);
    }, [watchedAvatar, isDirty, dirtyFields]);


    const onSubmit = () => {
        isDirty && mutateProfileUpdate(payload);
    }

    const previewAvatar = getAvatarImageSrc(watchedAvatar || profileData?.sAvatar, profileData?.sUserName);
    const nHandsPlayed = Number(profileData?.nGamePlayed) || 0;
    const nWins = Number(profileData?.nGameWon) || 0;
    const nWinRate = nHandsPlayed ? Math.round((nWins / nHandsPlayed) * 100) : 0;
    const nTotalBetAmount = Number(profileData?.nTotalBetAmount) || 0;
    const nTotalWinnings = Number(profileData?.nTotalWinningAmount) || 0;

    const handleOpenBugPanel = () => {
        window.FXOverlayUI?.toggleBugPanel?.();
    };

    const handleLogout = () => {
        removeCookie('sAuthToken');
        navigate('/login');
    };

    const aSettingsItems = [
        {
            id: 'profile-settings-shop',
            label: 'Shop',
            description: 'Top up chips and open the bankroll store.',
            onClick: () => navigate('/lobby?tab=lobby-shop'),
        },
        {
            id: 'profile-settings-transactions',
            label: 'My Transactions',
            description: 'Review your account transaction history.',
            onClick: () => navigate('/transactions'),
        },
        {
            id: 'profile-settings-lobby',
            label: 'Lobby',
            description: 'Jump back into the live lobby.',
            onClick: () => navigate('/lobby'),
        },
        {
            id: 'profile-settings-how-to-play',
            label: 'How To Play',
            description: 'Review table flow, actions, and controls.',
            onClick: () => navigate('/how-to-play'),
        },
        {
            id: 'profile-settings-rules',
            label: 'Game Rules',
            description: 'Read the official 21 Hold’em rules.',
            onClick: () => navigate('/game-rule'),
        },
        {
            id: 'profile-settings-contact',
            label: 'Contact Us',
            description: 'Open your email app and contact support directly.',
            onClick: () => {
                if (typeof window !== 'undefined') {
                    window.location.href = 'mailto:bigslickgames@gmail.com';
                }
            },
        },
        {
            id: 'profile-settings-terms',
            label: 'Terms & Conditions',
            description: 'See the platform terms and conditions.',
            onClick: () => navigate('/terms-conditions'),
        },
        {
            id: 'profile-settings-privacy',
            label: 'Privacy Policy',
            description: 'Review how account data is handled.',
            onClick: () => navigate('/privacy-policy'),
        },
        {
            id: 'profile-settings-bug',
            label: 'Report Bug',
            description: 'Open the bug panel from inside the app.',
            onClick: handleOpenBugPanel,
        },
        {
            id: 'profile-settings-logout',
            label: 'Log Out',
            description: 'Sign out of this device.',
            onClick: handleLogout,
            isDanger: true,
        },
    ];

    // Navigation bar handler
    const handleQuickNav = (item) => {
        if (item.path) {
            navigate(item.path);
        }
    };

    // Determine active nav item based on location
    const getActiveNavId = () => {
        if (location.pathname === '/profile') return 'lobby-settings';
        const tab = new URLSearchParams(location.search).get('tab');
        if (tab && QUICK_NAV_ITEMS.some(i => i.id === tab)) return tab;
        return '';
    };
    const activeNavId = getActiveNavId();

    return (
        <>
            <div className="profile">
                {/* Navigation tab icons */}
                <nav className="profile-quick-nav" aria-label="Lobby shortcuts" style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
                    {QUICK_NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={item.label}
                            aria-pressed={activeNavId === item.id}
                            className={`profile-quick-nav-btn${activeNavId === item.id ? ' is-active' : ''}`}
                            onClick={() => handleQuickNav(item)}
                            title={item.label}
                            style={{ background: 'none', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', color: activeNavId === item.id ? '#fff' : '#aaa', fontSize: 22, transition: 'color 0.2s' }}
                        >
                            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <FontAwesomeIcon icon={item.icon} />
                                <span style={{ fontSize: 10, marginTop: 2 }}>{item.label}</span>
                            </span>
                        </button>
                    ))}
                </nav>
                <div className="profile-header">SETTINGS</div>
                <Form className="profile-content" onSubmit={handleSubmit(onSubmit)}>
                    {
                        isProfileDataLoading ? (
                            <Spinner animation="border" className="mx-auto d-block" variant="white" />
                        ) : (
                            profileData && (
                                <>
                                    <Row>
                                        <Col xl={4}>
                                            <div className="avatar">
                                                <img
                                                    src={previewAvatar}
                                                    alt="avatar"
                                                    draggable='false'
                                                    onError={(event) => {
                                                        event.currentTarget.src = getAvatarImageSrc("", profileData?.sUserName);
                                                    }}
                                                />
                                            </div>
                                            <div className="avatar-name">{profileData?.sUserName}</div>
                                            <Form.Group>
                                                <Form.Label>Username</Form.Label>
                                                <div className="form-control disabled">{profileData?.sUserName ?? '-'}</div>
                                                <div className="profile-locked-note">Usernames are locked after signup and cannot be changed.</div>
                                            </Form.Group>
                                            <Form.Group className="mt-3">
                                                <Form.Label>Email ID</Form.Label>
                                                <div className="form-control disabled" >{profileData?.sEmail ?? '-'}</div>
                                            </Form.Group>
                                        </Col>
                                        <Col xl={8}>
                                            <div className="profile-stats">
                                                <div>
                                                    <div className="stats-value">{_.formatCurrencyWithComa(nTotalBetAmount)}</div>
                                                    <div className="stats-title">Amount Bet</div>
                                                </div>
                                                <div>
                                                    <div className="stats-value">{nHandsPlayed}</div>
                                                    <div className="stats-title">Hands Played</div>
                                                </div>
                                                <div>
                                                    <div className="stats-value">{nWinRate}%</div>
                                                    <div className="stats-title">Win %</div>
                                                </div>
                                                <div>
                                                    <div className="stats-value">{_.formatCurrencyWithComa(nTotalWinnings)}</div>
                                                    <div className="stats-title">Total Winnings</div>
                                                </div>
                                            </div>

                                            <div className="profile-settings">
                                                <div className="profile-settings-copy">
                                                    <div className="profile-settings-title">Settings</div>
                                                    <div className="profile-settings-text">
                                                        Rules, help, support, and account shortcuts now live in your player profile.
                                                    </div>
                                                </div>

                                                <div className="profile-settings-grid">
                                                    {aSettingsItems.map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            className={`profile-settings-item ${item.isDanger ? 'is-danger' : ''}`}
                                                            onClick={item.onClick}
                                                        >
                                                            <strong>{item.label}</strong>
                                                            <span>{item.description}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="avatar-picker-copy">
                                                <div className="avatar-picker-title">Choose your profile image</div>
                                                <div className="avatar-picker-text">
                                                    Your new profile image set is ready. Pick the look you want to take to the table.
                                                </div>
                                            </div>
                                            <div className="avatar-list">
                                                {
                                                    Array.from(new Map((avatarList || []).map(avatar => [avatar.sPath, avatar])).values())
                                                        .map((avatar, index) => (
                                                            <div
                                                                key={avatar.sPath}
                                                                className={`avatar-option ${avatar?.selected ? 'selected' : ''}`}
                                                                onClick={() => handleAvatarSelect(avatar)}
                                                                title={avatar?.label}
                                                            >
                                                                <div className="avatar-select-image">
                                                                    {avatar?.selected && <FontAwesomeIcon icon={faCircleCheck} className="select-icon" />}
                                                                    <img
                                                                        src={avatar?.sPath}
                                                                        alt={"avatar option"}
                                                                        draggable='false'
                                                                        onError={(event) => {
                                                                            event.currentTarget.src = getAvatarImageSrc("", avatar?.label || avatar?.id);
                                                                        }}
                                                                    />
                                                                </div>
                                                                {/* Avatar label removed for cleaner UI */}
                                                            </div>
                                                        ))
                                                }
                                            </div>
                                        </Col>
                                    </Row>
                                    <Button type="submit" className={`profile-submit ${!isDirty ? 'disable' : ''}`} disabled={!isDirty}>Save</Button>
                                </>
                            )
                        )
                    }
                </Form>
            </div>
        </>
    )
}
export default Profile;
