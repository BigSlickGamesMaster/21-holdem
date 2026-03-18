import { getDirtyFormValues } from "helper/helper";
import { getProfile, updateProfile } from "query/profile.query";
import React, { useEffect, useState } from "react";
import { Button, Col, Form, Row, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { ReactToastify } from "shared/utils";
import { buildAvatarOptions, getAvatarImageSrc } from "shared/constants/builtInAvatars";

const Profile = () => {

    const [payload, setPayload] = useState({});
    const queryClient = useQueryClient()
    const [avatarList, setAvatarList] = useState();
    const { control, register, reset, watch, formState: { errors, isDirty, dirtyFields }, handleSubmit, setValue } = useForm({ mode: "all" });

    const { data: profileData, isLoading: isProfileDataLoading } = useQuery("getProfile", getProfile, {
        select: (data) => data?.data?.data,
        onSuccess: (response) => {
            const selectedAvatar = getAvatarImageSrc(response?.sAvatar, response?.sUserName);
            reset({
                sUserName: response?.sUserName,
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

    useEffect(() => {
        const isDirtyField = {
            sUserName: watch("sUserName") || "-",
            sAvatar: watch("sAvatar") || "-",
        };

        const payloadData = getDirtyFormValues(dirtyFields, isDirtyField);
        setPayload(payloadData);
    }, [watch("sUserName"), watch('sAvatar'), isDirty, dirtyFields]);


    const onSubmit = (data) => {
        isDirty && mutateProfileUpdate(payload);
    }

    const sUserName = watch("sUserName");
    const sAvatar = watch("sAvatar");
    const previewAvatar = getAvatarImageSrc(sAvatar || profileData?.sAvatar, sUserName || profileData?.sUserName);

    return (
        <>
            <div className="profile">
                <div className="profile-header">My Profile</div>
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
                                                        event.currentTarget.src = getAvatarImageSrc("", sUserName || profileData?.sUserName);
                                                    }}
                                                />
                                            </div>
                                            <div className="avatar-name">{sUserName}</div>
                                            <Form.Group>
                                                <Form.Label>Username</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Enter username"
                                                    isInvalid={!!errors.sUserName}
                                                    {...register("sUserName", {
                                                        required: "Username is required",
                                                        minLength: {
                                                            value: 4,
                                                            message: "Username must be at least 4 characters"
                                                        }
                                                    })}
                                                />
                                            </Form.Group>
                                            <Form.Group className="mt-3">
                                                <Form.Label>Email ID</Form.Label>
                                                <div className="form-control disabled" >{profileData?.sEmail ?? '-'}</div>
                                            </Form.Group>
                                        </Col>
                                        <Col xl={8}>
                                            <div className="profile-stats">
                                                <div>
                                                    <div className="stats-value">{profileData?.nGamePlayed ?? '0'}</div>
                                                    <div className="stats-title">Total Game Played</div>
                                                </div>
                                                <div>
                                                    <div className="stats-value">{profileData?.nGameWon ?? '0'}</div>
                                                    <div className="stats-title">Total Win</div>
                                                </div>
                                                <div>
                                                    <div className="stats-value">{profileData?.nGameLost ?? '0'}</div>
                                                    <div className="stats-title">Total Lost</div>
                                                </div>
                                            </div>

                                            <div className="avatar-picker-copy">
                                                <div className="avatar-picker-title">Pick a player icon</div>
                                                <div className="avatar-picker-text">
                                                    Temporary built-in item avatars while custom profile art is still being finished.
                                                </div>
                                            </div>
                                            <div className="avatar-list">
                                                {
                                                    avatarList?.map((avatar, index) => (
                                                        <div
                                                            key={index}
                                                            className={`avatar-option ${avatar?.selected ? 'selected' : ''}`}
                                                            onClick={() => handleAvatarSelect(avatar)}
                                                            title={avatar?.label}
                                                        >
                                                            <div className="avatar-select-image">
                                                                {avatar?.selected && <FontAwesomeIcon icon={faCircleCheck} className="select-icon" />}
                                                                <img
                                                                    src={avatar?.sPath}
                                                                    alt={avatar?.label || "avatar option"}
                                                                    draggable='false'
                                                                    onError={(event) => {
                                                                        event.currentTarget.src = getAvatarImageSrc("", avatar?.label || avatar?.id);
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="avatar-option-label">{avatar?.label}</div>
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
