import { exchangeHandoff, forgotPassword, login, resetPassword, verifyToken } from 'query/login.query';
import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ReactToastify, setCookie } from 'shared/utils';
import eye from '../../../assets/images/icons/eye_icon.svg';
import eye_slash_icon from '../../../assets/images/icons/eye_slash_icon.svg';
import newBannerImg from '../../../assets/images/bg/new-banner.png';

const LOGIN_REMEMBER_ME_KEY = 'bsg:remember-me';
const LOGIN_REMEMBERED_IDENTIFIER_KEY = 'bsg:remembered-login';

const Login = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const forgotPasswordToken = searchParams.get('forgotPasswordToken');
    const handoffCode = searchParams.get('handoffCode');
    const verificationStatus = searchParams.get('verificationStatus');
    const verifiedUserName = searchParams.get('sUserName');

    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [showResetFields, setShowResetFields] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showSplash, setShowSplash] = useState(false);
    const [splashFading, setSplashFading] = useState(false);
    const splashTimerRef = useRef(null);

    const goToLobby = (path = '/lobby', opts = {}) => {
        setShowSplash(true);
        splashTimerRef.current = setTimeout(() => {
            setSplashFading(true);
            splashTimerRef.current = setTimeout(() => navigate(path, opts), 900);
        }, 4200);
    };
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(LOGIN_REMEMBER_ME_KEY) === 'true';
    });

    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm({ mode: 'onSubmit' });
    const {
        register: forgotPwdRegister,
        handleSubmit: forgotPwdHandleSubmit,
        formState: { errors: forgotPwdErrors },
        reset: forgotPWDReset,
    } = useForm({ mode: 'onSubmit' });

    const { mutate, isLoading } = useMutation(login, {
        onSuccess: (data) => {
            if (data.status === 200) {
                setCookie('sAuthToken', data.data.data.authorization, rememberMe ? 14 : undefined);
                goToLobby('/lobby');
            } else {
                ReactToastify(data.data.message, 'error', 'login');
            }
        },
        onError: (error) => {
            console.log(error);
            const devVerificationLink = error?.response?.data?.data?.oDevMailPreview?.sLink;
            if (devVerificationLink) {
                window.location.assign(devVerificationLink);
                return;
            }
            ReactToastify(error.response.data.message, 'error', 'login');
        },
    });

    const { mutate: exchangeHandoffMutate, isLoading: isHandoffLoading } = useMutation(exchangeHandoff, {
        onSuccess: (data) => {
            if (data.status === 200) {
                setCookie('sAuthToken', data.data.data.authorization, 14);
                goToLobby('/lobby', { replace: true });
            } else {
                ReactToastify(data?.data?.message || 'Website handoff failed', 'error', 'handoff');
            }
        },
        onError: (error) => {
            console.log(error);
            ReactToastify(error?.response?.data?.message || error?.response?.data?.detail || 'Website handoff failed', 'error', 'handoff');
            navigate('/login', { replace: true });
        },
    });

    const { mutate: forgotPwdMutate, isLoading: forgotPwdLoading } = useMutation(forgotPassword, {
        onSuccess: (data) => {
            if (data.status === 200) {
                ReactToastify(data.data.message, 'success', 'forgotPassword');
                setShowForgotPassword(false);
                setShowResetFields(false);
            } else {
                ReactToastify(data.data.message, 'error', 'forgotPassword');
            }
        },
        onError: (error) => {
            console.log(error);
            ReactToastify(error?.response?.data?.message, 'error', 'forgotPassword');
        },
    });

    const { mutate: resetPwdMutate, isLoading: resetPwdLoading } = useMutation(resetPassword, {
        onSuccess: (data) => {
            if (data.status === 200) {
                ReactToastify(data.data.message, 'success', 'resetPassword');
                setShowResetFields(false);
                setShowForgotPassword(false);
            } else {
                ReactToastify(data.data.message, 'error', 'resetPassword');
            }
        },
        onError: (error) => {
            console.log(error);
            ReactToastify(error.response.data.message, 'error', 'resetPassword');
        },
    });

    const { mutate: mutateVerifyToken } = useMutation(verifyToken, {
        onSuccess: () => {
            setShowResetFields(true);
            setShowForgotPassword(false);
        },
        onError: (error) => {
            console.log(error);
            ReactToastify(error.response.data.message, 'error', 'verifyToken');
            navigate('/login');
            setShowResetFields(false);
            setShowForgotPassword(false);
        },
    });

    useEffect(() => {
        if (forgotPasswordToken) mutateVerifyToken(forgotPasswordToken);
    }, [forgotPasswordToken, mutateVerifyToken]);

    useEffect(() => {
        if (handoffCode) {
            exchangeHandoffMutate({ handoffCode });
        }
    }, [exchangeHandoffMutate, handoffCode]);

    useEffect(() => {
        if (!verificationStatus) return;

        if (verificationStatus === 'success') {
            ReactToastify(verifiedUserName ? `Email verified for ${verifiedUserName}. You can sign in now.` : 'Email verified. You can sign in now.', 'success', 'verification');
        } else if (verificationStatus === 'already') {
            ReactToastify('Email is already verified. Please sign in.', 'success', 'verification');
        } else if (verificationStatus === 'expired') {
            ReactToastify('Verification link expired. Sign in to request a new one.', 'error', 'verification');
        }

        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.delete('verificationStatus');
        nextSearchParams.delete('sUserName');
        setSearchParams(nextSearchParams, { replace: true });
    }, [searchParams, setSearchParams, verificationStatus, verifiedUserName]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const rememberedIdentifier = window.localStorage.getItem(LOGIN_REMEMBERED_IDENTIFIER_KEY);
        if (rememberedIdentifier) {
            setValue('email', rememberedIdentifier);
        }
    }, [setValue]);

    function onLogin(data) {
        if (typeof window !== 'undefined') {
            if (rememberMe) {
                window.localStorage.setItem(LOGIN_REMEMBER_ME_KEY, 'true');
                window.localStorage.setItem(LOGIN_REMEMBERED_IDENTIFIER_KEY, data.email);
            } else {
                window.localStorage.removeItem(LOGIN_REMEMBER_ME_KEY);
                window.localStorage.removeItem(LOGIN_REMEMBERED_IDENTIFIER_KEY);
            }
        }

        mutate({
            sEmail: data.email,
            sPassword: data.password,
        });
        reset();
    }

    const onForgotPassword = (data) => {
        forgotPwdMutate({
            sEmail: data.forgotEmail,
        });
        forgotPWDReset();
    };

    const onResetPassword = (data) => {
        if (data.newPassword !== data.confirmPassword) {
            ReactToastify('Passwords do not match', 'error');
            return;
        }

        resetPwdMutate({
            sPassword: data.newPassword,
            sToken: forgotPasswordToken,
        });
        forgotPWDReset();
    };

    return (
        <>
        {showSplash && (
            <div className={`login-splash${splashFading ? ' login-splash--fade-out' : ''}`} aria-hidden='true'>
                <span className='login-splash__ring' />
                <span className='login-splash__ring login-splash__ring--two' />
                <span className='login-splash__ring login-splash__ring--three' />
                <div className='login-splash__logo-wrap'>
                    <img src={newBannerImg} alt="21 Hold'em" className='login-splash__logo' />
                    <span className='login-splash__tagline'>Welcome to the table</span>
                </div>
            </div>
        )}
        <div className='sign-in-container'>
            <div className='login-container'>
                <div className='auth-container auth-shell'>
                    <Row className='justify-content-center'>
                        <Col xl={7} lg={8} md={10} sm={12}>
                            {showForgotPassword ? (
                                <div className='auth-box auth-box--centered'>
                                    <div className='auth-form-container'>
                                        <h2 className='auth-title'>Forgot Password</h2>
                                        <div className='auth-form'>
                                            <Form onSubmit={forgotPwdHandleSubmit(onForgotPassword)} className='form'>
                                                <Form.Group className='form-group'>
                                                    <Form.Label>Email ID</Form.Label>
                                                    <Form.Control
                                                        type='email'
                                                        placeholder='Enter your Email ID'
                                                        className={`form-control ${forgotPwdErrors.forgotEmail ? 'border border-danger' : ''}`}
                                                        isInvalid={!!forgotPwdErrors.forgotEmail}
                                                        {...forgotPwdRegister('forgotEmail', {
                                                            required: 'Email is required',
                                                            pattern: {
                                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                                message: 'Invalid email address',
                                                            },
                                                        })}
                                                    />
                                                </Form.Group>
                                                <div className='form-group d-flex justify-content-between align-items-center'>
                                                    <div className='back-to-login'>
                                                        <a onClick={() => {
                                                            setShowResetFields(false);
                                                            setShowForgotPassword(false);
                                                        }} className='back-to-login'>Back to Login</a>
                                                    </div>
                                                </div>
                                                <div className='forgot-password-msg'>
                                                    Please enter your registered email address to reset your password.
                                                </div>
                                                <Button type='submit' className='btn btn-primary sign-in-btn'>
                                                    {forgotPwdLoading ? 'Submitting...' : 'Submit'}
                                                </Button>
                                            </Form>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {showResetFields ? (
                                <div className='auth-box auth-box--centered'>
                                    <div className='auth-form-container'>
                                        <h2 className='auth-title'>Reset Password</h2>
                                        <div className='auth-form'>
                                            <Form onSubmit={forgotPwdHandleSubmit(onResetPassword)} className='form'>
                                                <Form.Group className='form-group'>
                                                    <Form.Label>New Password</Form.Label>
                                                    <div className='position-relative'>
                                                        <Form.Control
                                                            type={showNewPassword ? 'text' : 'password'}
                                                            placeholder='Enter New Password'
                                                            className={`form-control ${forgotPwdErrors.newPassword ? 'border border-danger' : ''}`}
                                                            {...forgotPwdRegister('newPassword', {
                                                                required: 'New password is required',
                                                                validate: (value) => {
                                                                    const passwordPattern = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,16}$/;
                                                                    if (!passwordPattern.test(value)) {
                                                                        ReactToastify('Password must be 8-16 characters with a mix of letters, numbers, and a special character.', 'error', 'password');
                                                                        return false;
                                                                    }
                                                                    return true;
                                                                },
                                                                minLength: {
                                                                    value: 8,
                                                                    message: 'Password must be at least 8 characters',
                                                                },
                                                                maxLength: {
                                                                    value: 16,
                                                                    message: 'Password must be less than 16 characters',
                                                                },
                                                            })}
                                                        />
                                                        <img src={showNewPassword ? eye : eye_slash_icon} alt='eye' className='eye-icon' onClick={() => setShowNewPassword(!showNewPassword)} />
                                                    </div>
                                                </Form.Group>

                                                <Form.Group className='form-group'>
                                                    <Form.Label>Confirm Password</Form.Label>
                                                    <div className='position-relative'>
                                                        <Form.Control
                                                            type={showConfirmPassword ? 'text' : 'password'}
                                                            placeholder='Confirm New Password'
                                                            className={`form-control ${forgotPwdErrors.confirmPassword ? 'border border-danger' : ''}`}
                                                            {...forgotPwdRegister('confirmPassword', {
                                                                required: 'Please confirm your password',
                                                                validate: (value) => {
                                                                    const passwordPattern = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,16}$/;
                                                                    if (!passwordPattern.test(value)) {
                                                                        ReactToastify('Password must be 8-16 characters with a mix of letters, numbers, and a special character.', 'error', 'password');
                                                                        return false;
                                                                    }
                                                                    return true;
                                                                },
                                                                minLength: {
                                                                    value: 8,
                                                                    message: 'Password must be at least 8 characters',
                                                                },
                                                                maxLength: {
                                                                    value: 16,
                                                                    message: 'Password must be less than 16 characters',
                                                                },
                                                            })}
                                                        />
                                                        <img src={showConfirmPassword ? eye : eye_slash_icon} alt='eye' className='eye-icon' onClick={() => setShowConfirmPassword(!showConfirmPassword)} />
                                                    </div>
                                                </Form.Group>
                                                <div className='form-group d-flex justify-content-between align-items-center'>
                                                    <div className='back-to-login'>
                                                        <a onClick={() => {
                                                            setShowResetFields(false);
                                                            setShowForgotPassword(false);
                                                        }} className='back-to-login'>Back to Login</a>
                                                    </div>
                                                </div>
                                                <Button type='submit' className='btn btn-primary sign-in-btn'>
                                                    {resetPwdLoading ? 'Resetting...' : 'Reset Password'}
                                                </Button>
                                            </Form>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {!showForgotPassword && !showResetFields ? (
                                <div className='auth-box auth-box--centered'>
                                    <div className='auth-form-container'>
                                        <div className='auth-login-brand'>
                                            <div className='auth-login-brand__title'>
                                                <span className='auth-login-brand__title-number'>21</span>
                                                <span className='auth-login-brand__title-word'>Hold&apos;em</span>
                                            </div>
                                        </div>

                                        <div className='auth-form'>
                                            {handoffCode ? (
                                                <div className='forgot-password-msg'>
                                                    {isHandoffLoading
                                                        ? "Completing the Big Slick Games website handoff..."
                                                        : "Big Slick Games website handoff detected for this session."}
                                                </div>
                                            ) : null}
                                            <Form autoComplete='off' onSubmit={handleSubmit(onLogin)} className='form'>
                                                <Form.Group className='form-group'>
                                                    <Form.Label>Email ID or Username</Form.Label>
                                                    <Form.Control
                                                        type='text'
                                                        placeholder='Enter your Email ID or Username'
                                                        className={`form-control ${errors.email ? 'border border-danger' : ''}`}
                                                        isInvalid={!!errors.email}
                                                        {...register('email', {
                                                            required: 'Email or Username is Required',
                                                            validate: (value) => {
                                                                const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
                                                                const usernamePattern = /^[a-zA-Z0-9_]+$/;
                                                                if (emailPattern.test(value) || usernamePattern.test(value)) return true;
                                                                return 'Please enter a valid email or username';
                                                            },
                                                        })}
                                                    />
                                                </Form.Group>
                                                <Form.Group className='form-group'>
                                                    <Form.Label>Password</Form.Label>
                                                    <div className='position-relative'>
                                                        <Form.Control
                                                            type={showPassword ? 'text' : 'password'}
                                                            placeholder='Enter Password'
                                                            className={`form-control ${errors.password ? 'border border-danger' : ''}`}
                                                            {...register('password', {
                                                                required: 'Password is required',
                                                                validate: (value) => {
                                                                    const passwordPattern = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,16}$/;
                                                                    if (!passwordPattern.test(value)) {
                                                                        ReactToastify('Password must be 8-16 characters with a mix of letters, numbers, and a special character.', 'error', 'password');
                                                                        return false;
                                                                    }
                                                                    return true;
                                                                },
                                                                minLength: {
                                                                    value: 8,
                                                                    message: 'Password must be at least 8 characters',
                                                                },
                                                                maxLength: {
                                                                    value: 16,
                                                                    message: 'Password must be less than 16 characters',
                                                                },
                                                            })}
                                                        />
                                                        <img src={showPassword ? eye : eye_slash_icon} alt='eye' className='eye-icon' onClick={() => setShowPassword(!showPassword)} />
                                                    </div>
                                                </Form.Group>
                                                <div className='form-group d-flex justify-content-between align-items-center'>
                                                    <div className="form-check auth-remember-check">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            id="remember-me"
                                                            checked={rememberMe}
                                                            onChange={(event) => setRememberMe(event.target.checked)}
                                                        />
                                                        <label className="form-check-label" htmlFor="remember-me">
                                                            Remember Me
                                                        </label>
                                                    </div>
                                                    <div className='back-to-login auth-login-links'>
                                                        Don&apos;t have an account? <a onClick={() => navigate('/register')}>Register</a>
                                                    </div>
                                                    <div className='forgot-password'>
                                                        <a onClick={() => setShowForgotPassword(true)}>Forgot Password?</a>
                                                    </div>
                                                </div>
                                                <Button type='submit' className='btn btn-primary sign-in-btn'>
                                                    {isHandoffLoading ? 'Connecting...' : isLoading ? 'Signing in...' : 'Sign In'}
                                                </Button>
                                            </Form>
                                        </div>
                                    </div>
                                    <div className='auth-guest-panel'>
                                        <div className='auth-guest-actions'>
                                            <Button type='button' className='guest-entry-btn' onClick={() => navigate('/guest')}>
                                                Guest
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </Col>
                    </Row>
                </div>
            </div>
        </div>
        </>
    );
};

export default Login;
